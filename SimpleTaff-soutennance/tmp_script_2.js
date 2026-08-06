async function __wrapper() {
// Disable Tailwind preflight to avoid CSS conflicts on layout elements
        tailwind.config = { corePlugins: { preflight: false } };
}