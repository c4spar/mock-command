import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import {
  mockCommand,
  mockGlobalCommand,
  resetCommand,
  resetGlobalCommand,
} from "./mod.ts";

Deno.test("@c4spar/mock-command", async (ctx) => {
  const defaultOutput = {
    stdout: new Uint8Array(),
    stderr: new Uint8Array(),
    code: 0,
    success: true,
    signal: null,
  };

  await ctx.step({
    name: "should init and reset mockCommand",
    async fn() {
      const originalCommand = Deno.Command;
      mockCommand("deno");
      assertNotEquals(originalCommand, Deno.Command);

      const cmd = new Deno.Command("deno");
      await cmd.output();

      resetCommand();
      assertEquals(originalCommand, Deno.Command);
    },
  });

  await ctx.step({
    name: "should init and reset mockCommand globally",
    async fn() {
      const originalCommand = Deno.Command;
      mockGlobalCommand();
      assertNotEquals(originalCommand, Deno.Command);

      mockCommand("deno");
      assertNotEquals(originalCommand, Deno.Command);
      const cmd = new Deno.Command("deno");
      await cmd.output();
      resetCommand();
      assertNotEquals(originalCommand, Deno.Command);

      resetGlobalCommand();
      assertEquals(originalCommand, Deno.Command);
    },
  });

  await ctx.step({
    name: "should throw an error for unhandled Deno.Command call",
    async fn() {
      mockGlobalCommand();
      const cmd = new Deno.Command("deno");
      await assertRejects(
        () => cmd.output(),
        Error,
        'Unhandled Deno.Command call: "deno"',
      );
      resetGlobalCommand();
    },
  });

  await ctx.step({
    name: "should throw an error for unmatched Deno.Command call",
    fn() {
      mockCommand({ command: "deno", args: ["fmt"] });
      assertThrows(
        () => resetCommand(),
        Error,
        'Expected 1 more Deno.Command call(s) to match: [\n  {\n    command: "deno",\n    args: [\n      "fmt",\n    ],\n  },\n]',
      );
    },
  });

  await ctx.step({
    name: "should match by command string",
    async fn() {
      mockCommand("deno");
      const cmd = new Deno.Command("deno");
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by command option",
    async fn() {
      mockCommand({ command: "deno" });
      const cmd = new Deno.Command("deno");
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by args option",
    async fn() {
      mockCommand({ command: "deno", args: ["fmt"] });
      const cmd = new Deno.Command("deno", { args: ["fmt"] });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by cwd option",
    async fn() {
      mockCommand({ command: "deno", cwd: "/tmp" });
      const cmd = new Deno.Command("deno", { cwd: "/tmp" });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by clearEnv option",
    async fn() {
      mockCommand({ command: "deno", clearEnv: true });
      const cmd = new Deno.Command("deno", { clearEnv: true });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by env option",
    async fn() {
      mockCommand({ command: "deno", env: { foo: "bar" } });
      const cmd = new Deno.Command("deno", { env: { foo: "bar" } });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by uid option",
    async fn() {
      mockCommand({ command: "deno", uid: 1001 });
      const cmd = new Deno.Command("deno", { uid: 1001 });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by gid option",
    async fn() {
      mockCommand({ command: "deno", gid: 1001 });
      const cmd = new Deno.Command("deno", { gid: 1001 });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by stdin option",
    async fn() {
      mockCommand({ command: "deno", stdin: "piped" });
      const cmd = new Deno.Command("deno", { stdin: "piped" });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by stdout option",
    async fn() {
      mockCommand({ command: "deno", stdout: "piped" });
      const cmd = new Deno.Command("deno", { stdout: "piped" });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by stderr option",
    async fn() {
      mockCommand({ command: "deno", stderr: "piped" });
      const cmd = new Deno.Command("deno", { stderr: "piped" });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should match by windowsRawArguments option",
    async fn() {
      mockCommand({ command: "deno", windowsRawArguments: true });
      const cmd = new Deno.Command("deno", { windowsRawArguments: true });
      const output = await cmd.output();
      assertEquals(output, defaultOutput);
      resetCommand();
    },
  });

  await ctx.step({
    name: "should throw if signal is aborted",
    fn() {
      const controller = new AbortController();
      controller.abort(new Error("aborted"));
      mockCommand({ signal: controller.signal });
      const cmd = new Deno.Command("deno");
      assertRejects(
        () => cmd.output(),
        Error,
        "aborted",
      );
      resetCommand();
    },
  });

  await ctx.step({
    name: "should mock command output and outputSync",
    async fn() {
      const expectedOutput: Deno.CommandOutput = {
        signal: "SIGABRT",
        stderr: new TextEncoder().encode("stderr"),
        stdout: new TextEncoder().encode("stdout"),
        code: 1,
        success: false,
      };
      mockCommand("deno", expectedOutput);
      mockCommand("deno", expectedOutput);
      const cmd = new Deno.Command("deno");

      const output = await cmd.output();
      assertEquals(output, expectedOutput);

      const syncOutput = cmd.outputSync();
      assertEquals(syncOutput, expectedOutput);

      resetCommand();
    },
  });
});
