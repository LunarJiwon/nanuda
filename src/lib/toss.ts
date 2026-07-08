// Whether Toss Payments is actually configured — `NEXT_PUBLIC_TOSS_CLIENT_KEY` is inlined at
// build time, so this is a compile-time constant in the client bundle, not a runtime check.
// Toss integration (tips + subscriptions) is deferred for cost reasons — see SupportButton.tsx /
// SubscribeButton.tsx, which show a "준비중" placeholder instead of attempting a payment while
// this is false, rather than letting a click fail with a raw "client key missing" error.
export const TOSS_ENABLED = Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
