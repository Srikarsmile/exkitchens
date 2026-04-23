const NODE_INSTRUMENTATION_KEY = "__exkitchensNodeInstrumentation";

type GlobalWithInstrumentation = typeof globalThis & {
  __exkitchensNodeInstrumentation?: boolean;
};

const globalWithInstrumentation = globalThis as GlobalWithInstrumentation;

if (!globalWithInstrumentation[NODE_INSTRUMENTATION_KEY]) {
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection", reason);
  });

  process.on("uncaughtExceptionMonitor", (error, origin) => {
    console.error("Uncaught exception", { error, origin });
  });

  globalWithInstrumentation[NODE_INSTRUMENTATION_KEY] = true;
}

export {};
