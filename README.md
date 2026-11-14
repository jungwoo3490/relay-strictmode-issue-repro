# relay-strictmode-issue-repro

`useLazyLoadQuery` with `fetchPolicy: 'network-only'` refetches forever under React 19 `<StrictMode>` (dev).

- react / react-dom 19.3.1
- react-relay / relay-runtime 21.0.1

## Projects

| Folder | Relay | Result |
| --- | --- | --- |
| `bug/` | unmodified 21.0.1 | request count keeps increasing, `Loading...` stays visible |
| `fixed/` | 21.0.1 + [`patches/react-relay+21.0.1.patch`](fixed/patches/react-relay+21.0.1.patch) | 1 request, content renders |

`src/main.jsx` is identical in both. The only difference is the patch, applied by `patch-package` on `postinstall`.

## Run

```sh
cd bug    # or fixed
npm install
npm run dev
```

The page shows the number of requests sent by the network layer.

Query params:

- `?policy=store-and-network`: change the fetch policy (default `network-only`)
- `?strict=0`: render without `<StrictMode>`

## Observed

| URL | `bug/` | `fixed/` |
| --- | --- | --- |
| `/` | keeps increasing (~3 per second), stuck on `Loading...` | 1, renders |
| `/?policy=store-and-network` | 2, renders | 1, renders |
| `/?strict=0` | 1, renders | 1, renders |

## Fix

When the query effect is set up again after a cleanup, re-retain the existing result if its data is still in the store, and only force a refetch when it is gone:

```diff
   useEffect(function () {
     if (maybeHiddenOrFastRefresh.current === true) {
       maybeHiddenOrFastRefresh.current = false;
+      if (preparedQueryResult != null && environment.check(preparedQueryResult.operation).status === "available") {
+        var disposable = QueryResource.retain(preparedQueryResult, profilerContext);
+        return function () {
+          disposable.dispose();
+        };
+      }
       forceUpdate(function (n) {
         return n + 1;
       });
```
