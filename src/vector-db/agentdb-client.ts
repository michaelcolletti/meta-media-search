/**
 * AgentDB Client
 * Lightning-fast memory system for AI agent personalization
 */

import type { Vector } from '../types/index.js';

export interface UserInteraction {
  userId: string;
  mediaId: string;
  type: 'watch' | 'like' | 'skip' | 'rate' | 'search';
  timestamp: number;
  duration?: number;
  completion?: number;
  rating?: number;
  embedding?: Vector;
}

export interface ReasoningStrategy {
  id: string;
  title: string;
  description: string;
  heuristics: string[];
  checks: string[];
  constraints: string[];
  embedding: Vector;
  performanceMetrics: {
    successRate: number;
    avgExecutionTimeMs: number;
    lastUpdated: string;
  };
}

export interface AgentDBConfig {
  dimensions: number;
  mcp?: {
    enabled: boolean;
    tools?: string[];
  };
}

/**
 * AgentDB client for user memory and reasoning strategies
 */
export class AgentDBClient {
  private config: AgentDBConfig;
  private userMemories: Map<string, UserInteraction[]>;
  private reasoningBank: Map<string, ReasoningStrategy>;
  private userProfiles: Map<string, { embedding: Vector; lastUpdated: number }>;

  constructor(config: AgentDBConfig) {
    this.config = config;
    this.userMemories = new Map();
    this.reasoningBank = new Map();
    this.userProfiles = new Map();
  }

  /**
   * Initialize AgentDB with optional MCP integration
   */
  async initialize(): Promise<void> {
    console.log('[AgentDB] Initializing with config:', this.config);

    // Load initial reasoning strategies
    await this.loadDefaultStrategies();
  }

  /**
   * Store user interaction in memory
   */
  async storeInteraction(interaction: UserInteraction): Promise<void> {
    const memories = this.userMemories.get(interaction.userId) || [];
    memories.push(interaction);
    this.userMemories.set(interaction.userId, memories);

    // Update user profile embedding
    await this.updateUserProfile(interaction.userId);
  }

  /**
   * Retrieve user's recent interactions
   */
  async getInteractions(userId: string, limit: number = 50): Promise<UserInteraction[]> {
    const memories = this.userMemories.get(userId) || [];
    return memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Build personalization context for user
   */
  async buildContext(userId: string, options: {
    windowSize?: number;
    includeReasoningStrategies?: boolean;
  } = {}): Promise<{
    memory: UserInteraction[];
    strategies?: ReasoningStrategy[];
    profile?: { embedding: Vector; lastUpdated: number };
  }> {
    const windowSize = options.windowSize || 50;
    const memory = await this.getInteractions(userId, windowSize);

    const result: any = { memory };

    if (options.includeReasoningStrategies) {
      result.strategies = await this.getRelevantStrategies(userId);
    }

    const profile = this.userProfiles.get(userId);
    if (profile) {
      result.profile = profile;
    }

    return result;
  }

  /**
   * Store reasoning strategy in ReasoningBank
   */
  async storeStrategy(strategy: ReasoningStrategy): Promise<void> {
    this.reasoningBank.set(strategy.id, strategy);
  }

  /**
   * Retrieve relevant strategies for user context
   */
  async getRelevantStrategies(userId: string, topK: number = 5): Promise<ReasoningStrategy[]> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      // Return default strategies
      return Array.from(this.reasoningBank.values()).slice(0, topK);
    }

    // Calculate similarity between user profile and strategy embeddings
    const strategies = Array.from(this.reasoningBank.values());
    const scored = strategies.map(strategy => ({
      strategy,
      score: this.cosineSimilarity(profile.embedding, strategy.embedding),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ strategy }) => strategy);
  }

  /**
   * Evolve strategy based on feedback
   */
  async evolveStrategy(strategyId: string, feedback: {
    success: boolean;
    executionTimeMs: number;
    modification?: {
      type: 'add_heuristic' | 'add_constraint' | 'add_check';
      content: string;
    };
  }): Promise<void> {
    const strategy = this.reasoningBank.get(strategyId);
    if (!strategy) return;

    // Update performance metrics
    const { performanceMetrics } = strategy;
    const alpha = 0.1; // Learning rate

    performanceMetrics.successRate =
      performanceMetrics.successRate * (1 - alpha) +
      (feedback.success ? 1 : 0) * alpha;

    performanceMetrics.avgExecutionTimeMs =
      performanceMetrics.avgExecutionTimeMs * (1 - alpha) +
      feedback.executionTimeMs * alpha;

    performanceMetrics.lastUpdated = new Date().toISOString();

    // Apply modification
    if (feedback.modification) {
      switch (feedback.modification.type) {
        case 'add_heuristic':
          strategy.heuristics.push(feedback.modification.content);
          break;
        case 'add_constraint':
          strategy.constraints.push(feedback.modification.content);
          break;
        case 'add_check':
          strategy.checks.push(feedback.modification.content);
          break;
      }
    }

    this.reasoningBank.set(strategyId, strategy);
  }

  /**
   * Causal inference for feature importance
   */
  async causalInference(options: {
    userId: string;
    targetMetric: 'watch_completion' | 'engagement' | 'rating';
    features: string[];
    interactions: UserInteraction[];
  }): Promise<{ effects: Record<string, number> }> {
    // Simplified causal inference - production would use more sophisticated methods
    const { interactions, features, targetMetric } = options;

    const effects: Record<string, number> = {};

    // Calculate correlation for each feature
    for (const feature of features) {
      effects[feature] = Math.random() * 0.5; // Placeholder
    }

    return { effects };
  }

  /**
   * Get user profile embedding
   */
  async getUserProfile(userId: string): Promise<Vector | null> {
    const profile = this.userProfiles.get(userId);
    return profile ? profile.embedding : null;
  }

  /**
   * Update user profile based on interactions
   */
  private async updateUserProfile(userId: string): Promise<void> {
    const interactions = await this.getInteractions(userId, 50);

    if (interactions.length === 0) return;

    // Calculate weighted average of interaction embeddings
    const embedding = new Array(this.config.dimensions).fill(0);
    let totalWeight = 0;

    for (const interaction of interactions) {
      if (!interaction.embedding) continue;

      const weight = this.calculateInteractionWeight(interaction);
      totalWeight += weight;

      for (let i = 0; i < this.config.dimensions; i++) {
        embedding[i] += interaction.embedding[i] * weight;
      }
    }

    // Normalize
    if (totalWeight > 0) {
      for (let i = 0; i < this.config.dimensions; i++) {
        embedding[i] /= totalWeight;
      }
    }

    this.userProfiles.set(userId, {
      embedding,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Calculate weight for interaction based on recency and engagement
   */
  private calculateInteractionWeight(interaction: UserInteraction): number {
    const age = Date.now() - interaction.timestamp;
    const ageInDays = age / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-ageInDays / 30); // 30-day decay

    let engagementWeight = 0.5; // Default

    if (interaction.type === 'watch' && interaction.completion) {
      engagementWeight = interaction.completion;
    } else if (interaction.type === 'rate' && interaction.rating) {
      engagementWeight = interaction.rating / 10;
    } else if (interaction.type === 'like') {
      engagementWeight = 1.0;
    } else if (interaction.type === 'skip') {
      engagementWeight = 0.1;
    }

    return recencyWeight * engagementWeight;
  }

  /**
   * Load default reasoning strategies
   */
  private async loadDefaultStrategies(): Promise<void> {
    const strategies: Partial<ReasoningStrategy>[] = [
      {
        id: 'genre-preference',
        title: 'Genre Preference Extraction',
        description: 'Extract user genre preferences from viewing patterns',
        heuristics: [
          'Weight recent interactions with decay factor 0.95',
          'Require >80% watch completion for strong signal',
          'Cluster co-occurring genres',
        ],
        checks: [
          'Minimum 5 interactions required',
          'Exclude content watched <10%',
          'Temporal consistency over 30 days',
        ],
        constraints: [
          'Max 10 genres per profile',
          'Weekly decay of genre weights',
          'Confidence threshold 0.6',
        ],
      },
      {
        id: 'platform-optimization',
        title: 'Platform Availability Optimization',
        description: 'Prioritize recommendations on user preferred platforms',
        heuristics: [
          'Track platform usage frequency',
          'Weight by subscription status',
          'Consider device context (TV vs mobile)',
        ],
        checks: [
          'Verify platform availability',
          'Check regional restrictions',
          'Validate subscription tier',
        ],
        constraints: [
          'Max 3 preferred platforms',
          'Refresh availability monthly',
          'Fallback to all platforms if none preferred',
        ],
      },
    ];

    for (const strat of strategies) {
      const embedding = this.generateStrategyEmbedding(strat);
      const strategy: ReasoningStrategy = {
        ...(strat as ReasoningStrategy),
        embedding,
        performanceMetrics: {
          successRate: 0.7,
          avgExecutionTimeMs: 50,
          lastUpdated: new Date().toISOString(),
        },
      };

      await this.storeStrategy(strategy);
    }
  }

  /**
   * Generate embedding for strategy
   */
  private generateStrategyEmbedding(strategy: Partial<ReasoningStrategy>): Vector {
    // Simplified - production would use actual embedding model
    const embedding = new Array(this.config.dimensions).fill(0);
    const seed = strategy.title?.length || 0;

    for (let i = 0; i < this.config.dimensions; i++) {
      embedding[i] = Math.sin(seed + i) * 0.1;
    }

    return embedding;
  }

  private cosineSimilarity(a: Vector, b: Vector): number {
    const dotProd = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (normA === 0 || normB === 0) return 0;
    return dotProd / (normA * normB);
  }
}

export default AgentDBClient;
