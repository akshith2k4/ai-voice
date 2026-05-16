import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import { playScanSound } from "../utils/scanSound";

class ScannerSocketService {
  stompClient = null;
  isConnected = false;
  currentSessionId = null;
  subscription = null;
  onSessionMessage = null;

  getWsBaseUrl() {
    const apiBase = import.meta.env.VITE_BASE_URL || "";
    if (!apiBase) {
      return "";
    }
    return apiBase.replace(/\/api\/?$/, "");
  }

  connect({ sessionId, onSessionMessage }) {
    if (!sessionId) {
      console.warn("⚠️ WebSocket connect called without sessionId");
      return;
    }

    this.onSessionMessage = onSessionMessage || null;

    if (this.isConnected && this.currentSessionId === sessionId) {
      console.log("✅ Already connected to session:", sessionId);
      console.log("🔄 Updated session message callback for existing connection");
      return;
    }

    this.disconnect();

    const wsBaseUrl = this.getWsBaseUrl();
    const socketUrl = `${wsBaseUrl}/ws`;

    console.log("🔌 Connecting to WebSocket...");
    console.log("   📍 URL:", socketUrl);
    console.log("   🎫 Session ID:", sessionId);

    const socket = new SockJS(socketUrl);

    this.stompClient = Stomp.over(socket);
    // Enable debug for troubleshooting (comment out to disable)
    this.stompClient.debug = (str) => {
      console.log("🔵 STOMP:", str);
    };
    this.currentSessionId = sessionId;

    this.stompClient.connect(
      {},
      () => {
        this.isConnected = true;
        console.log("✅ WebSocket CONNECTED successfully");

        const topic = `/topic/rfid/session/${sessionId}`;
        console.log("📡 Subscribing to topic:", topic);

        this.subscription = this.stompClient.subscribe(
          topic,
          (message) => {
            console.log("🎉 WebSocket message received!");
            console.log("   📦 Raw message:", message);
            
            if (!message?.body) {
              console.warn("⚠️ Message has no body");
              return;
            }

            console.log("   📄 Message body:", message.body);

            try {
              const body = JSON.parse(message.body);
              console.log("   ✅ Parsed data:", body);

              // 🔊 Play scan sound – always 2 chimes per scan message
              playScanSound(2);

              console.log("   🎯 Calling onSessionMessage callback...");
              
              if (this.onSessionMessage) {
                this.onSessionMessage(body);
                console.log("   ✅ Callback executed successfully");
              } else {
                console.error("   ❌ onSessionMessage callback is not defined!");
              }
            } catch (error) {
              console.error("❌ RFID Socket parse error:", error);
              console.error("   Raw body:", message.body);
            }
          }
        );

        console.log("✅ Successfully subscribed to topic");
      },
      (error) => {
        console.error("❌ RFID Socket connection error:", error);
        this.isConnected = false;
        this.currentSessionId = null;
        this.subscription = null;
        this.onSessionMessage = null;
      }
    );
  }

  disconnect() {
    console.log("🔌 Disconnecting WebSocket...");
    
    if (this.subscription) {
      try {
        this.subscription.unsubscribe();
        console.log("   ✅ Unsubscribed from topic");
      } catch (e) {
        console.error("   ❌ Error unsubscribing:", e);
      }
      this.subscription = null;
    }

    if (this.stompClient) {
      try {
        this.stompClient.disconnect(() => {
          this.isConnected = false;
          this.currentSessionId = null;
          this.onSessionMessage = null;
          console.log("   ✅ WebSocket disconnected");
        });
      } catch (error) {
        console.error("   ❌ Error disconnecting:", error);
        this.isConnected = false;
        this.currentSessionId = null;
        this.onSessionMessage = null;
      }
    }

    this.stompClient = null;
  }

  hasActiveConnection() {
    return this.isConnected && !!this.currentSessionId;
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }
}

export const scannerSocketService = new ScannerSocketService();
