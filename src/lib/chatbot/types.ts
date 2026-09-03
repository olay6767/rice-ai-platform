export interface ChatbotRequest {
  message: string;
  previousInteractionId?: string | null;
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
