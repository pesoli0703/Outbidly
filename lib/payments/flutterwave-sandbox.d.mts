export type SandboxIntent = { reference: string; amount: string | number; currency: string };
export type SandboxProvider = { checkout(input: {reference: string; amount: string; email: string; redirectUrl: string}): Promise<string>; verify(id: string | number): Promise<unknown> };
export type SandboxStore = {find(reference: string): Promise<SandboxIntent | null>; confirm(input: {reference: string; transactionId: string; amount: string | number; currency: string}): Promise<void>};
export function createSandboxFlutterwave(options: {secretKey: string; fetcher?: typeof fetch}): SandboxProvider;
export function processSandboxWebhook(options: {header: string | null; secret: string | undefined; event: unknown; provider: SandboxProvider; store: SandboxStore}): Promise<{status: number}>;
