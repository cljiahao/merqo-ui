// driver.js's package.json exposes "./dist/driver.css" as a real export
// subpath, but ships no type declaration for it (it's a stylesheet, not a
// module). This ambient declaration exists purely so `tsc`/tsup's `dts`
// build can resolve the side-effect `import("driver.js/dist/driver.css")`
// in dashboard-tour.tsx — it has no runtime effect.
declare module "driver.js/dist/driver.css" {
  const noop: undefined;
  export default noop;
}
