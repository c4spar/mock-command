# mock-command

[![JSR](https://jsr.io/badges/@c4spar/mock-command)](https://jsr.io/@c4spar/mock-command)
[![JSR Score](https://jsr.io/badges/@c4spar/mock-command/score)](https://jsr.io/@c4spar/mock-command)

Test utilities to intercept and mock shell commands made with `Deno.Command`.

> [!NOTE]\
> The full documentation can be found on
> [jsr.io](https://jsr.io/@c4spar/mock-command).

### Examples

#### Mock Deno.Command in a single test

```ts
import { assertEquals } from "@std/assert";
import { mockCommand, resetCommand } from "@c4spar/mock-command";

Deno.test({
  name: "should mock a shell command made with Deno.Command",
  async fn() {
    mockCommand({
      command: "deno",
      args: ["run", "example.ts"],
    }, {
      stdout: new TextEncoder().encode("example output"),
    });

    const cmd = new Deno.Command("deno", {
      args: ["run", "example.ts"],
    });
    const output = await cmd.output();

    assertEquals(output, {
      stdout: new TextEncoder().encode("example output"),
      stderr: new Uint8Array(),
      code: 0,
      success: true,
      signal: null,
    });

    resetCommand();
  },
});
```

#### Mock Deno.Command for all tests in a test file

```ts
import { assertEquals } from "@std/assert";
import {
  mockCommand,
  mockGlobalCommand,
  resetCommand,
  resetGlobalCommand,
} from "@c4spar/mock-command";

Deno.test("MyLib", async (ctx) => {
  mockGlobalCommand();

  await ctx.step({
    name: "should mock a shell command made with Deno.Command",
    async fn() {
      mockCommand({
        command: "deno",
        args: ["run", "example.ts"],
      }, {
        stdout: new TextEncoder().encode("example output"),
      });

      const cmd = new Deno.Command("deno", {
        args: ["run", "example.ts"],
      });
      const output = await cmd.output();

      assertEquals(output, {
        stdout: new TextEncoder().encode("example output"),
        stderr: new Uint8Array(),
        code: 0,
        success: true,
        signal: null,
      });

      resetCommand();
    },
  });

  // More test steps...

  resetGlobalCommand();
});
```
