export type KnowledgeTopic =
  | "flood"
  | "storm"
  | "drought"
  | "yield"
  | "price";

export interface ChatbotRequest {
  message: string;
  previousInteractionId?: string | null;
  pagePath?: string;
  knowledgeTopics?: KnowledgeTopic[];
}

export type ChatbotStreamEvent =
  | {
      type: "delta";
      delta: string;
    }
  | {
      type: "done";
      interactionId: string;
      model: string;
      knowledgeTopics?: KnowledgeTopic[];
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

export interface ChatbotApiError {
  error: {
    code: string;
    message: string;
  };
}
