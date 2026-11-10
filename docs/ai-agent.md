# AI agent

## Current provider

The only implemented provider is:

`mock / deterministic-rules-v1`

It is deliberately labeled as deterministic. The application does not pretend that an external LLM is connected.

## Investigation inputs

The provider can read:

- invoice data
- purchase-order data
- goods-receipt data
- vendor history
- active policy evidence
- duplicate indicators
- deterministic variance checks
- deterministic risk factors

## Investigation output

Reports contain structured fields such as:

- finding type
- evidence references
- match checks
- risk factors
- recommendation
- approval requirement
- actions taken
- confidence state

Confidence is not presented as calibrated model probability.

## Safety boundary

The investigation provider:

- cannot execute financial actions;
- cannot release payment;
- cannot change approval state;
- does not store hidden chain-of-thought;
- does not call OpenAI or Gemini;
- fails visibly when required evidence is unavailable.

## Copilot

The copilot uses structured queries and real application evidence.

Permission checks remain server-side. User text cannot grant additional tool authority.

## Future AI work

Possible future additions include external LLM adapters, embedding retrieval, grounded generation, formal evaluation datasets, provider observability, and bounded tool calling with explicit authorization.
