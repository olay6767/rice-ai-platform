export const BEHAVIOR_FEATURES = [
  'weather',
  'disease',
  'yield',
  'chat',
] as const;

export type BehaviorFeature = (typeof BEHAVIOR_FEATURES)[number];
export type BehaviorEventType = 'view' | 'chat';

export interface PersonalizedRecommendationData {
  recommendations: string[];
  suggestedQuestions: string[];
  needsFarmField: boolean;
  message: string | null;
  source: 'ai' | 'rules';
}

export interface RecommendationApiSuccess {
  data: PersonalizedRecommendationData;
}

export interface RecommendationApiError {
  error: {
    code: string;
    message: string;
};
}
