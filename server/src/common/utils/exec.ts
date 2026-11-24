import { spawn } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024 * 1024;
const STDERR_TAIL_CHARS = 2000;

export interface RunOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  maxOutputBytes?: number;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs a binary without a shell (arguments are never interpolated), collecting output.
 * Non-zero exit codes are returned, not thrown: several scanners use them to signal "findings".
 * Throws only when the process cannot start, times out, or exceeds the output limit.
 */
export const runCommand = (command: string, args: string[], options: RunOptions = {}): Promise<RunResult> =>
  new Promise((resolve, reject) => {
    const { cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES } = options;
    const child = spawn(command, args, { cwd, env: env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let failure: Error | undefined;

    const fail = (error: Error) => {
      failure ??= error;
      child.kill('SIGKILL');
    };
    const timer = setTimeout(() => fail(new Error(`${command} timed out after ${timeoutMs / 1000}s`)), timeoutMs);

    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        fail(new Error(`${command} produced more than ${maxOutputBytes} bytes of output`));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on('data', collect(stdout));
    child.stderr.on('data', collect(stderr));

    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(error.code === 'ENOENT' ? new Error(`${command} is not installed or not on PATH`) : error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (failure) {
        reject(failure);
        return;
      }
      resolve({
        exitCode: code ?? -1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      });
    });
  });

export const stderrTail = (result: RunResult) => result.stderr.trim().slice(-STDERR_TAIL_CHARS);
