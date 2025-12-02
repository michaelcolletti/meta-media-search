# ADR-003: AI Orchestration - LangChain + OpenAI

**Status:** Accepted
**Date:** 2025-01-15
**Deciders:** System Architect
**Context:** Framework for NLP query processing and recommendation generation

## Context and Problem Statement

Meta-Media-Search requires sophisticated AI capabilities:

1. **Natural Language Understanding:** Parse user queries into structured intents
2. **Semantic Search:** Convert text to embeddings for similarity matching
3. **Recommendation Explanations:** Generate human-readable reasons
4. **Query Expansion:** Suggest related search terms
5. **Content Summarization:** Create concise content descriptions

These AI capabilities must be:

- **Reliable:** High uptime and consistent quality
- **Fast:** <500ms for query processing
- **Cost-Effective:** Optimize API call costs
- **Maintainable:** Easy to update prompts and models

## Decision Drivers

1. **Model Quality:** State-of-the-art NLP performance
2. **Latency:** <500ms p95 for query processing
3. **Cost:** <$0.01 per user interaction
4. **Developer Experience:** Easy prompt engineering and testing
5. **Flexibility:** Support multiple models (GPT-4, Claude, etc.)
6. **Observability:** Track usage, costs, and errors
7. **Caching:** Avoid redundant API calls

## Considered Options

### Option 1: OpenAI GPT-4 (Direct API)

**Pros:**

- Best-in-class NLP quality
- Fast response times (~500ms)
- Simple REST API
- Excellent embeddings (text-embedding-3-large)
- Strong documentation

**Cons:**

- Costly ($30 per 1M input tokens for GPT-4)
- No built-in orchestration (manual chaining)
- Vendor lock-in
- Rate limiting requires manual handling
- No prompt management

**Cost:** ~$0.015 per query (GPT-4 mini), ~$0.06 per query (GPT-4)
**Latency:** ~300ms

### Option 2: LangChain + OpenAI

**Pros:**

- Abstraction over multiple LLM providers
- Built-in chaining and orchestration
- Prompt templates and versioning
- Memory management for conversations
- Extensive integrations (vector DBs, tools)
- Active development and community

**Cons:**

- Additional abstraction layer (slight overhead)
- Learning curve for LangChain concepts
- Beta features can be unstable
- Still depends on underlying LLM costs

**Cost:** Same as Option 1 (OpenAI pricing) + ~5% overhead
**Latency:** ~350ms (50ms LangChain overhead)

### Option 3: Anthropic Claude (Direct API)

**Pros:**

- Strong reasoning capabilities
- Longer context windows (100K tokens)
- Competitive pricing
- Good at structured output

**Cons:**

- Smaller ecosystem than OpenAI
- No embeddings model (need separate provider)
- Newer, less battle-tested
- Rate limits more restrictive

**Cost:** ~$0.01 per query (Claude 3 Haiku), ~$0.03 per query (Claude 3 Sonnet)
**Latency:** ~400ms

### Option 4: Self-Hosted OSS Models (Mistral, Llama 3)

**Pros:**

- No API costs (only infrastructure)
- Full control and customization
- No rate limits
- Data privacy (stays on-prem)

**Cons:**

- Requires GPU infrastructure ($500+/mo)
- Model quality below GPT-4
- DevOps burden (deployment, scaling, monitoring)
- Slower inference (1-2s on CPU)
- Need to manage embeddings separately

**Cost:** ~$500/mo (GPU server) = $0.005 per query @ 100K queries/mo
**Latency:** ~1500ms (GPU), ~3000ms (CPU)

### Option 5: Cohere

**Pros:**

- Good embeddings and reranking
- Competitive pricing
- Built for enterprise

**Cons:**

- Less flexible than GPT-4 for complex reasoning
- Smaller community
- Fewer integrations

**Cost:** ~$0.008 per query
**Latency:** ~300ms

## Decision Outcome

**Chosen Option:** **LangChain + OpenAI (GPT-4 mini for queries, text-embedding-3-large for embeddings)**

### Rationale

LangChain + OpenAI provides the best balance of:

1. **Quality:** GPT-4 mini (sufficient for our use cases) with 82% of GPT-4 quality at 20% cost
2. **Developer Experience:** LangChain simplifies complex orchestration
3. **Flexibility:** Easy to swap providers (Claude, Mistral) without code changes
4. **Cost-Effective:** GPT-4 mini at $0.15/$0.60 per 1M tokens (in/out)
5. **Ecosystem:** Rich integrations with vector DBs, tools, and monitoring

### Architecture

```typescript
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';

// Initialize models
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini', // Fast, cheap, high quality
  temperature: 0.3, // Consistent but creative
  maxTokens: 1000,
  cache: true, // Enable prompt caching
});

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-large',
  dimensions: 1536,
});

// Query parsing chain
const queryParsePrompt = PromptTemplate.fromTemplate(`
You are a media search assistant. Parse the following user query into structured data.

User Query: {query}
User History: {history}

Extract:
1. Intent (search, explore, recommend, filter)
2. Entities (actors, directors, genres, themes, platforms)
3. Filters (year range, rating range, content type)
4. 5 related search terms for query expansion

Return JSON:
{{
  "intent": "...",
  "entities": [{{ "type": "...", "value": "...", "confidence": 0.0-1.0 }}],
  "filters": {{ ... }},
  "expandedTerms": ["...", "...", ...]
}}
`);

const queryParseChain = new LLMChain({
  llm,
  prompt: queryParsePrompt,
  outputParser: new JsonOutputParser(),
});

// Recommendation explanation chain
const explanationPrompt = PromptTemplate.fromTemplate(`
Generate a concise explanation for why we recommend "{contentTitle}" to this user.

User's Watch History: {history}
Content Metadata: {metadata}
Similarity Score: {score}

Generate 2-3 short, engaging reasons (e.g., "Because you watched Breaking Bad", "Highly rated thriller").
`);

const explanationChain = new LLMChain({
  llm,
  prompt: explanationPrompt,
});
```

### Cost Optimization Strategies

1. **Aggressive Caching:**

   ```typescript
   import { RedisCache } from 'langchain/cache/redis';

   const cache = new RedisCache({
     redisClient: redis,
     ttl: 3600, // 1 hour
   });

   const llm = new ChatOpenAI({
     cache, // Identical queries return cached results
     // ...
   });
   ```

2. **Batch Embeddings:**

   ```typescript
   // Generate embeddings for 100 items at once
   const embeddings = await openai.embeddings.create({
     model: 'text-embedding-3-large',
     input: contentTexts, // Array of 100 strings
   });
   // Cost: $0.00013 for 100 embeddings vs. $0.013 for 100 individual calls
   ```

3. **Use Cheaper Models Where Possible:**

   ```typescript
   // GPT-4 mini for most tasks
   const fastLLM = new ChatOpenAI({ modelName: 'gpt-4o-mini' });

   // GPT-4 only for complex reasoning
   const smartLLM = new ChatOpenAI({ modelName: 'gpt-4' });

   // Route based on complexity
   const llm = complexity === 'high' ? smartLLM : fastLLM;
   ```

4. **Prompt Compression:**

   ```typescript
   // Bad: 500 tokens
   const badPrompt = `
     Here is the full viewing history with 50 movies and all their metadata...
   `;

   // Good: 100 tokens
   const goodPrompt = `
     Top 5 watched: {top5}
     Favorite genres: {genres}
     Avg rating: {avgRating}
   `;
   ```

5. **Semantic Caching:**

   ```typescript
   async function semanticallyCachedQuery(query: string) {
     // Generate embedding for query
     const queryEmbedding = await embeddings.embedQuery(query);

     // Check if similar query cached (cosine similarity > 0.95)
     const similar = await findSimilarCachedQuery(queryEmbedding, 0.95);

     if (similar) return similar.result;

     // Cache miss - call LLM
     const result = await llm.call(query);
     await cacheQuery(queryEmbedding, result);
     return result;
   }
   ```

### Prompt Management

```typescript
// Store prompts in database for versioning
interface PromptVersion {
  id: string;
  name: string;
  version: number;
  template: string;
  active: boolean;
  performance: {
    avgLatency: number;
    successRate: number;
    userSatisfaction: number;
  };
}

// A/B test prompts
async function getPrompt(name: string): Promise<string> {
  const activePrompts = await db.prompts.findMany({
    where: { name, active: true },
    orderBy: { version: 'desc' },
  });

  // Randomly select for A/B testing
  const prompt = weightedRandom(activePrompts);
  return prompt.template;
}
```

### Error Handling and Fallbacks

```typescript
import { RetryLogic } from 'langchain/llms/openai';

const llm = new ChatOpenAI({
  maxRetries: 3,
  timeout: 5000,
  onFailedAttempt: error => {
    console.error(`Attempt failed: ${error.message}`);
  },
});

// Fallback to simpler model
async function robustQuery(query: string) {
  try {
    return await llm.call(query);
  } catch (error) {
    if (error.code === 'rate_limit_exceeded') {
      // Fallback to cached similar query
      return await findCachedSimilarQuery(query);
    }
    if (error.code === 'timeout') {
      // Fallback to rule-based parsing
      return await ruleBasedParse(query);
    }
    throw error;
  }
}
```

### Observability

```typescript
import { CallbackManager } from 'langchain/callbacks';
import { ConsoleCallbackHandler } from 'langchain/callbacks/handlers/console';

const callbackManager = CallbackManager.fromHandlers({
  async handleLLMStart(llm, prompts) {
    console.log('LLM started', { model: llm.modelName, prompts });
    await analytics.track('llm_call_started', {
      model: llm.modelName,
      promptLength: prompts[0].length,
    });
  },

  async handleLLMEnd(output) {
    const cost = calculateCost(output);
    await analytics.track('llm_call_completed', {
      tokens: output.llmOutput.tokenUsage,
      cost,
      latency: output.llmOutput.latency,
    });
  },

  async handleLLMError(error) {
    await analytics.track('llm_call_failed', {
      error: error.message,
    });
  },
});

const llm = new ChatOpenAI({
  callbackManager,
  // ...
});
```

### Example: End-to-End Query Processing

```typescript
async function processUserQuery(userId: string, query: string): Promise<QueryResult> {
  // 1. Get user context
  const userHistory = await db.getUserHistory(userId, { limit: 10 });
  const preferences = await db.getUserPreferences(userId);

  // 2. Parse query with LangChain
  const parsed = await queryParseChain.call({
    query,
    history: userHistory.map(h => h.content.title).join(', '),
  });

  // 3. Generate query embedding
  const queryEmbedding = await embeddings.embedQuery(`${query} ${parsed.expandedTerms.join(' ')}`);

  // 4. Semantic search in Pinecone
  const semanticResults = await pinecone.query({
    vector: queryEmbedding,
    topK: 100,
    filter: buildFilters(parsed.filters, preferences),
  });

  // 5. Fetch full metadata from PostgreSQL
  const contentIds = semanticResults.matches.map(m => m.id);
  const contents = await db.content.findMany({
    where: { id: { in: contentIds } },
  });

  // 6. Rank with hybrid algorithm
  const ranked = await hybridRanking(contents, {
    semanticScores: semanticResults.matches,
    userPreferences: preferences,
    popularityBoost: 0.2,
  });

  // 7. Generate explanations for top results
  const topResults = ranked.slice(0, 20);
  const withExplanations = await Promise.all(
    topResults.map(async content => ({
      content,
      explanation: await explanationChain.call({
        contentTitle: content.title,
        history: userHistory
          .map(h => h.content.title)
          .slice(0, 3)
          .join(', '),
        metadata: JSON.stringify({
          genres: content.genres,
          rating: content.rating,
          year: content.year,
        }),
        score: content.relevanceScore,
      }),
    }))
  );

  // 8. Generate visual map
  const map = await generateVisualMap(topResults, parsed.intent);

  return {
    query: parsed,
    results: withExplanations,
    map,
  };
}
```

## Consequences

### Positive

- ✅ Best-in-class NLP quality with GPT-4 mini
- ✅ LangChain simplifies complex orchestration
- ✅ Easy to swap models (test Claude, Mistral, etc.)
- ✅ Built-in caching reduces costs by ~70%
- ✅ Prompt versioning enables A/B testing
- ✅ Rich observability with callbacks

### Negative

- ❌ Dependency on OpenAI uptime (~99.9%)
- ❌ API costs scale with usage (~$0.015 per query)
- ❌ LangChain adds complexity and learning curve
- ❌ Rate limits require careful handling
- ❌ Prompt injection security concerns

### Mitigation Strategies

1. **Uptime:**
   - Implement fallbacks to cached results
   - Rule-based parsing as last resort
   - Multi-provider setup (Claude as backup)

2. **Cost:**
   - Aggressive caching (70% hit rate target)
   - Batch operations where possible
   - Monitor and alert on cost spikes

3. **Security:**
   - Input sanitization
   - Rate limiting per user
   - Prompt injection detection

## Validation

**Success Criteria:**

- [ ] Query parsing accuracy >90%
- [ ] Latency <500ms p95
- [ ] Cost <$0.02 per query
- [ ] Cache hit rate >70%
- [ ] Uptime >99.5% (including fallbacks)

**Testing Plan:**

1. Benchmark 1000 diverse queries
2. Measure accuracy vs. human labels
3. Load test: 100 concurrent users
4. Cost analysis: Daily spend tracking

## Future Considerations

### When to Add Claude

- If OpenAI rate limits become blocking
- If 100K context windows needed (long user histories)
- If cost optimization critical (Claude Haiku at $0.008/query)

### When to Self-Host

- If monthly OpenAI costs exceed $5000
- If data privacy becomes regulatory requirement
- If custom fine-tuning needed for domain expertise

### Fine-Tuning Strategy

```typescript
// Collect training data from user interactions
interface TrainingExample {
  query: string;
  expectedIntent: QueryIntent;
  expectedEntities: Entity[];
  userSatisfaction: number; // 1-5 rating
}

// Fine-tune when we have 10K+ high-quality examples
async function fineTuneModel() {
  const examples = await db.trainingExamples.findMany({
    where: { userSatisfaction: { gte: 4 } },
    take: 10000,
  });

  // OpenAI fine-tuning API
  const fineTuneJob = await openai.fineTunes.create({
    training_file: formatForFineTuning(examples),
    model: 'gpt-4o-mini',
    suffix: 'media-query-parser',
  });

  // Deploy when complete
  const customModel = `gpt-4o-mini:ft-${fineTuneJob.id}`;
}
```

## References

- [LangChain Documentation](https://js.langchain.com/docs/)
- [OpenAI API Pricing](https://openai.com/pricing)
- [GPT-4 mini Benchmarks](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
