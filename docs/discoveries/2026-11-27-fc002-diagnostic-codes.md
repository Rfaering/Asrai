# FC002 evaluation omits diagnostic codes

On 2026-11-27, `npm run factory:next` selected FC001. FC001 was still `ready` in the registry after its implementation merged, so FC002 remained pending.

Send each of these JSON requests separately to `node src/adapter.mjs`:

```json
{"protocolVersion":1,"operation":"validate","source":"flowchart TB\nA[broken"}
{"protocolVersion":1,"operation":"validate","source":"flowchart TB\nA -->"}
```

The FC001 implementation rejected both requests with `ASRAI_UNSUPPORTED`, pointing to line 2, columns 2 and 3 respectively. `specs/protocol.md` calls for `ASRAI_SYNTAX` on malformed supported syntax and reserves `ASRAI_UNSUPPORTED` for deliberate scope rejection. The recorded Mermaid 11.17.2 observations confirm rejection for both inputs. The diagnostic code comes from the Asrai protocol.

`npm run evaluate -- --capability FC002` reported 11 of 11 checks passing on that baseline. The FC002 fixtures specify only `accepted: false`, and the evaluator accepts any nonempty diagnostic code on rejection. The passing report therefore leaves the distinction between malformed and unsupported syntax unverified.

The FC002 candidate now returns `ASRAI_SYNTAX` for both requests at the same locations. The developer tests check those codes and locations, along with `ASRAI_UNSUPPORTED` for complete shape and edge statements.

In a separate specification and evaluator review, add expected diagnostic codes to the FC002 rejection cases and check them explicitly. Add an evaluator regression that rejects `ASRAI_UNSUPPORTED` when a case expects `ASRAI_SYNTAX`.

- Candidate source SHA-256 `60b9cd8ab974eaeeb27389c44c9919ed952023e7a20c2ef4e03af9458cb3864d`
- Acceptance SHA-256 `8a6c9536cd26216de1797d8e5c7a8acbc1ec72285950eef4b14379c977412eb8`
