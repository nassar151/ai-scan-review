// Bear UI depends on @forgedevstack/anvil, whose main entry also imports its Vue composables.
// Bear never calls them, so `vue` is aliased to this stub instead of installing Vue.
const unsupported = (): never => {
  throw new Error('Vue is not available in this React app');
};

export const ref = unsupported;
export const watch = unsupported;
export const computed = unsupported;
export const onMounted = unsupported;
export const onUnmounted = unsupported;
