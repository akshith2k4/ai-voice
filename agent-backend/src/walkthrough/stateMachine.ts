export type WalkthroughState = "IDLE" | "ACTIVE" | "PAUSED" | "DETOUR_QA";

export class WalkthroughStateMachine {
  private state: WalkthroughState = "IDLE";

  get currentState(): WalkthroughState {
    return this.state;
  }

  transition(event: string): void {
    switch (event) {
      case "START_WALKTHROUGH":
        this.state = "ACTIVE"; break;
      case "PAUSE":
        if (this.state === "ACTIVE") this.state = "PAUSED"; break;
      case "RESUME":
        this.state = "ACTIVE"; break;
      case "DETOUR":
        this.state = "DETOUR_QA"; break;
      case "DETOUR_COMPLETE":
        this.state = "ACTIVE"; break;
      case "RESET":
        this.state = "IDLE"; break;
    }
  }
}
