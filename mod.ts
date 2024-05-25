/**
 * Test utilities to intercept and mock shell commands made with
 * {@linkcode Deno.Command}.
 *
 * @example Mock {@linkcode Deno.Command} in a single test.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mockCommand, resetCommand } from "@c4spar/mock-command";
 *
 * Deno.test({
 *   name: "should mock a shell command made with Deno.Command",
 *   async fn() {
 *     mockCommand({
 *       command: "deno",
 *       args: ["run", "example.ts"],
 *     }, {
 *       stdout: new TextEncoder().encode("example output"),
 *     });
 *
 *     const cmd = new Deno.Command("deno", {
 *       args: ["run", "example.ts"],
 *     });
 *     const output = await cmd.output();
 *
 *     assertEquals(output, {
 *       stdout: new TextEncoder().encode("example output"),
 *       stderr: new Uint8Array(),
 *       code: 0,
 *       success: true,
 *       signal: null,
 *     });
 *
 *     resetCommand();
 *   },
 * });
 * ```
 *
 * @example Mock {@linkcode Deno.Command} for all tests in a test file.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   mockCommand,
 *   mockGlobalCommand,
 *   resetCommand,
 *   resetGlobalCommand,
 * } from "@c4spar/mock-command";
 *
 * Deno.test("MyLib", async (ctx) => {
 *   mockGlobalCommand();
 *
 *   await ctx.step({
 *     name: "should mock a shell command made with Deno.Command",
 *     async fn() {
 *       mockCommand({
 *         command: "deno",
 *         args: ["run", "example.ts"],
 *       }, {
 *         stdout: new TextEncoder().encode("example output"),
 *       });
 *
 *       const cmd = new Deno.Command("deno", {
 *         args: ["run", "example.ts"],
 *       });
 *       const output = await cmd.output();
 *
 *       assertEquals(output, {
 *         stdout: new TextEncoder().encode("example output"),
 *         stderr: new Uint8Array(),
 *         code: 0,
 *         success: true,
 *         signal: null,
 *       });
 *
 *       resetCommand();
 *     },
 *   });
 *
 *   // More test steps...
 *
 *   resetGlobalCommand();
 * });
 * ```
 *
 * @module
 */
import { equal } from "@std/assert/equal";

const mocks: Array<CommandMock> = [];

const originalCommand: typeof Deno.Command = Deno.Command;

let isGlobalMock = false;

/**
 * Overrides the global {@linkcode Deno.Command} class to intercept all shell
 * commands in all test steps.
 *
 * This function can be called additionally during the test setup to ensure that
 * no real commands are executed in any tests.
 *
 * > [!IMPORTANT]
 * > If used, you should call additionally the {@linkcode resetGlobalCommand}
 * > function in the teardown phase from your test to restore the original
 * > {@linkcode Deno.Command} class.
 *
 * > [!IMPORTANT]
 * > If this function is called, the {@linkcode resetCommand} function is not
 * > restoring the original {@linkcode Deno.Command} class unless
 * > {@linkcode resetGlobalCommand} is called.
 *
 * @example Ensure all shell commands are intercepted
 *
 * This ensures that the {@linkcode Deno.Command} class throws an error if you
 * run a test that doesn't call {@linkcode mockCommand} within the test itself.
 *
 * ```ts
 * import { assertRejects } from "@std/assert";
 * import { mockGlobalCommand, resetGlobalCommand } from "@c4spar/mock-command";
 *
 * Deno.test("MyLib", async (ctx) => {
 *   mockGlobalCommand();
 *
 *   await ctx.step({
 *     name: "should ...",
 *     async fn() {
 *       const cmd = new Deno.Command("deno");
 *       await assertRejects(
 *         () => cmd.output(),
 *         Error,
 *         'Unhandled Deno.Command call: "deno"',
 *       );
 *     },
 *   });
 *
 *   // More test steps...
 *
 *   resetGlobalCommand();
 * });
 * ```
 */
export function mockGlobalCommand(): void {
  isGlobalMock = true;
  mockCommandApi();
}

/** Options to match a shell command made with {@linkcode Deno.Command}. */
export interface MatchCommandOptions extends Deno.CommandOptions {
  /**
   * Match a shell command by name.
   *
   * @example Use the URLPattern web api
   *
   * ```ts
   * import { assertEquals } from "@std/assert";
   * import { mockCommand, resetCommand } from "@c4spar/mock-command";
   *
   * Deno.test({
   *   name: "should mock a command",
   *   async fn() {
   *     mockCommand({ command: "example" }, {
   *       stdout: new TextEncoder().encode("example output"),
   *     });
   *
   *     const cmd = new Deno.Command("example");
   *     const output = await cmd.output();
   *
   *     assertEquals(
   *       output.stdout,
   *       new TextEncoder().encode("example output"),
   *     );
   *
   *     resetCommand();
   *   },
   * });
   * ```
   */
  command?: string;
  /**
   * An {@linkcode AbortSignal} which can be used to abort a mocked command.
   *
   * @example Abort a shell command
   *
   * ```ts
   * import { assertRejects } from "@std/assert";
   * import { mockCommand, resetCommand } from "@c4spar/mock-command";
   *
   * Deno.test({
   *   name: "should abort a shell command made with Deno.Command",
   *   fn() {
   *     const controller = new AbortController();
   *     controller.abort(new Error("aborted"));
   *
   *     mockCommand({
   *       command: "example",
   *       signal: controller.signal,
   *     });
   *
   *     const cmd = new Deno.Command("example");
   *
   *     assertRejects(
   *       () => cmd.output(),
   *       Error,
   *       "aborted",
   *     );
   *     resetCommand();
   *   },
   * });
   * ```
   */
  signal?: AbortSignal;
}

/** Options to mock the output from {@linkcode Deno.Command}. */
export type MockCommandOutputOptions = Partial<Deno.CommandOutput>;

/**
 * Mocks a shell command made with {@linkcode Deno.Command}.
 *
 * The {@linkcode mockCommand} function can be used to mock a shell command made
 * with {@linkcode Deno.Command}. {@linkcode mockCommand} can be called multiple
 * times to mock multiple shell commands.
 *
 * > [!IMPORTANT]
 * > Make sure to call {@linkcode resetCommand} once at the end of each test
 * > step to restore the original {@linkcode Deno.Command} class.
 *
 * @example Mock {@linkcode Deno.Command} call(s)
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mockCommand, resetCommand } from "@c4spar/mock-command";
 *
 * Deno.test({
 *   name: "should mock a shell command made with Deno.Command",
 *   async fn() {
 *     mockCommand({
 *       command: "deno",
 *       args: ["run", "example.ts"],
 *     }, {
 *       stdout: new TextEncoder().encode("example output"),
 *     });
 *
 *     const cmd = new Deno.Command("deno", {
 *       args: ["run", "example.ts"],
 *     });
 *     const output = await cmd.output();
 *
 *     assertEquals(output, {
 *       stdout: new TextEncoder().encode("example output"),
 *       stderr: new Uint8Array(),
 *       code: 0,
 *       success: true,
 *       signal: null,
 *     });
 *
 *     resetCommand();
 *   },
 * });
 * ```
 *
 * @param matchOptions  Command match options.
 * @param mockOptions   Command mock options.
 */
export function mockCommand(
  matchOptions: string | MatchCommandOptions,
  mockOptions: MockCommandOutputOptions = {},
): void {
  mockCommandApi();

  if (typeof matchOptions === "string") {
    matchOptions = { command: matchOptions };
  }

  mocks.push({ matchOptions, mockOptions });
}

/**
 * Restores the original global {@linkcode Deno.Command} class.
 *
 * Throws additionally an error if expected commands are still pending.
 *
 * > [!IMPORTANT]
 * > If {@linkcode mockGlobalCommand} is called, this function will not restore
 * > the original global {@linkcode Deno.Command} class unless
 * > {@linkcode resetGlobalCommand} is called.
 */
export function resetCommand(): void {
  if (!isGlobalMock) {
    if (Deno.Command === originalCommand) {
      return;
    }
    Deno.Command = originalCommand;
  }

  if (mocks.length) {
    const error = new Error(
      `Expected ${mocks.length} more Deno.Command call(s) to match: ` +
        Deno.inspect(mocks.map((m) => m.matchOptions), {
          compact: false,
          colors: false,
          trailingComma: true,
        }),
    );
    Error.captureStackTrace(error, resetCommand);
    mocks.splice(0, mocks.length);
    throw error;
  }
}

/**
 * Disables global {@linkcode Deno.Command} mock and restores the original
 * global {@linkcode Deno.Command} class.
 *
 * Throws additionally an error if expected commands are still pending.
 */
export function resetGlobalCommand() {
  if (!isGlobalMock) {
    return;
  }
  isGlobalMock = false;
  resetCommand();
}

function mockCommandApi() {
  if (Deno.Command !== originalCommand) {
    return;
  }

  Deno.Command = class Command implements Deno.Command {
    readonly #command: string | URL;
    readonly #options?: Deno.CommandOptions;
    constructor(
      command: string | URL,
      options?: Deno.CommandOptions,
    ) {
      this.#command = command;
      this.#options = options;
    }

    spawn(): Deno.ChildProcess {
      const error = new Error("Deno.Command.spawn mock not implemented.");
      Error.captureStackTrace(error, Deno.Command.prototype.spawn);
      throw error;
    }

    outputSync(): Deno.CommandOutput {
      return outputSync(this.#command, this.#options);
    }

    // deno-lint-ignore require-await
    async output(): Promise<Deno.CommandOutput> {
      return outputSync(this.#command, this.#options);
    }
  };

  function outputSync(
    command: string | URL,
    options?: Deno.CommandOptions,
  ): Deno.CommandOutput {
    const match = matchCommand(command, options);

    if (!match) {
      const error = new Error(
        `Unhandled Deno.Command call: ${Deno.inspect(command)}${
          options ? ` ${Deno.inspect(options)}` : ""
        }`,
      );
      Error.captureStackTrace(error, Deno.Command);
      throw error;
    }

    match.matchOptions.signal?.throwIfAborted();

    return mockCommandOutput(match.mockOptions);
  }
}

function matchCommand(
  command: string | URL,
  options?: Deno.CommandOptions,
): CommandMock | undefined {
  if (command instanceof URL) {
    command = command.href;
  }

  for (const mock of mocks) {
    if (mock.matchOptions.command && mock.matchOptions.command !== command) {
      continue;
    }
    if (
      mock.matchOptions.args && !equal(mock.matchOptions.args, options?.args)
    ) {
      continue;
    }
    if (mock.matchOptions.cwd && !equal(mock.matchOptions.cwd, options?.cwd)) {
      continue;
    }
    if (
      mock.matchOptions.clearEnv !== undefined &&
      mock.matchOptions.clearEnv !== options?.clearEnv
    ) {
      continue;
    }
    if (mock.matchOptions.env && !equal(mock.matchOptions.env, options?.env)) {
      continue;
    }
    if (
      mock.matchOptions.uid !== undefined &&
      mock.matchOptions.uid !== options?.uid
    ) {
      continue;
    }
    if (
      mock.matchOptions.gid !== undefined &&
      mock.matchOptions.gid !== options?.gid
    ) {
      continue;
    }
    if (mock.matchOptions.stdin && mock.matchOptions.stdin !== options?.stdin) {
      continue;
    }
    if (
      mock.matchOptions.stdout && mock.matchOptions.stdout !== options?.stdout
    ) {
      continue;
    }
    if (
      mock.matchOptions.stderr && mock.matchOptions.stderr !== options?.stderr
    ) {
      continue;
    }
    if (
      mock.matchOptions.windowsRawArguments !== undefined &&
      mock.matchOptions.windowsRawArguments !== options?.windowsRawArguments
    ) {
      continue;
    }
    const index = mocks.findIndex((m) => m === mock);
    mocks.splice(index, 1);

    return mock;
  }
}

function mockCommandOutput(
  options: MockCommandOutputOptions,
): Deno.CommandOutput {
  return {
    stdout: new Uint8Array(),
    stderr: new Uint8Array(),
    code: 0,
    success: true,
    signal: null,
    ...options,
  };
}

interface CommandMock {
  matchOptions: MatchCommandOptions;
  mockOptions: MockCommandOutputOptions;
}
