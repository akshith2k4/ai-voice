import { connectionManager } from "../connectionManager.js";
import type { StatusAwaiter } from "./statusAwaiter.js";
import type { WalkthroughSession } from "./sessionManager.js";
import { promises as fsPromises } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const activeNarrations = new Map<string, { interrupted: boolean }>();

export function interruptNarration(sessionId: string) {
  const state = activeNarrations.get(sessionId);
  if (state) {
    state.interrupted = true;
  }
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const AUDIO_MAP = new Map<string, string>();

function register(text: string, filename: string) {
  AUDIO_MAP.set(normalizeText(text), filename);
}

// Register all pre-recorded walkthrough audio files
// Form Overview & Wrap-up
register(
  "Hmm... ALRIGHT! So, we're on the Order form now. An Order is basically how we keep track of linen pickups and deliveries for a customer. Think of it as the plan that tells us what needs to go out, what needs to come back, and when all of that should happen! Alright... let's create one together!",
  "orders_overview_1.pcm"
);
register(
  "Perfect... that's everything you need to create an Order. We've selected a customer, chosen the order type, set the required dates, and added the necessary items. This was only a walkthrough, so no actual data has been saved. Whenever you're ready, you can create a real order! And if you'd like help with another form... just let me know and we'll go through that one as well.",
  "orders_wrapup_1.pcm"
);

// Main Fields
register(
  "Okay... first up is Order Reference ID. This is just a unique name or number for the order. You can enter your own reference if your team follows a specific format. And if you don't want to worry about it... that's completely fine too. The system can generate one automatically when you save!",
  "orders_referenceid_1.pcm"
);
register(
  "Moving on... let's choose the Customer. This is the customer we're creating the order for. Just start typing the name and the system will help you find the right one. If you can't find a customer here... they're usually inactive or haven't been created yet!",
  "orders_customer_selection_1.pcm"
);
register(
  "Next, we have Order Date. This is simply the date on which the order is being created. Most of the time, today's date is EXACTLY what you need, so you can leave it as is. But if you're entering an older order... you can change it here.",
  "orders_order_date_1.pcm"
);
register(
  "Now this one is EXTREMELY important... Order Type. This tells the system what kind of work we're doing. Leasing is the most common option. Rental is usually for short-term usage, and Washing is when the customer sends their own linen to be cleaned. Depending on what you choose here... you'll notice some fields appear or disappear further down the form.",
  "orders_order_type_1.pcm"
);
register(
  "You'll also see Adjustment Order. In most cases, you can leave this turned OFF. This is only used when you're correcting or updating an existing order instead of creating a completely new one.",
  "orders_adjustment_order_1.pcm"
);
register(
  "Now, let's figure out how the movement of items will happen. Do we ONLY need to deliver items? ONLY pick them up? Or do BOTH in the same visit?? Most leasing customers usually use Both, because fresh linen is delivered while used linen is collected at the same time.",
  "orders_delivery_type_1.pcm"
);
register(
  "Now for the Pickup Date. This is when your team will go to collect the used linen. It usually defaults to tomorrow, but you can change it as needed. Just be careful not to schedule it on a weekend unless your team is working.",
  "orders_pickup_date_1.pcm"
);
register(
  "And the Delivery Date. This is when you'll drop off the fresh linen. Again, it usually defaults to tomorrow. Just make sure your warehouse has enough time to prepare everything by this date.",
  "order_delivery_date_1.pcm"
);

// subForms: deliveryItem
register(
  "Finally, let's add the actual items to be delivered to the customer! These are the linen products they will receive.",
  "orders_subform_introduction_1.pcm"
);
register(
  "You can add multiple items to a single order. Let me add a second one to show you.",
  "orders_subform_multiple_item_transitions_1.pcm"
);
register(
  "What product are we delivering? For leasing customers, this list only shows items reserved in their agreement. The system often fills this in automatically.",
  "orders_subform_product_1.pcm"
);
register(
  "How many of these do they need for this delivery cycle? Just enter the number here.",
  "orders_subform_quantity_1.pcm"
);
register(
  "Any special notes for this item? Maybe something like 'handle with care' or 'premium quality requested'.",
  "order_subform_remarks.pcm"
);

// subForms: pickupItem
register(
  "These are the items being picked up from the customer. You can add them manually, or use the 'Use same items as Delivery' checkbox to copy the delivery items automatically.",
  "orders_pickup_subform_introductions_1.pcm"
);
register(
  "These items can be copied from deliveryItem.",
  "orders_subform_pickup_copy_1.pcm"
);
register(
  "I've checked the copy option to automatically copy items.",
  "orders_subform_pickup_checkbox_copyoption_1.pcm"
);
register(
  "Let me add a second pickup item to show you.",
  "orders_subform_pickup_multipleitems_transition_1.pcm"
);
register(
  "Which product are we picking up? Usually, this is the exact same type of item we delivered to them previously.",
  "orders_subform_pickupitem_product_1.pcm"
);
register(
  "And how many are we collecting? This might be different from the delivery amount if they're still using some of the items.",
  "orders_subform_pickup_quantity_1.pcm"
);
register(
  "Need to add any notes? Like 'customer reported 5 damaged items' or anything else the team should know.",
  "orders_subform_pickupitem_remarks.pcm"
);

// subForms: rentalItem
register(
  "Now let's add the items being rented out. Just select the item, enter the quantity, and specify how long the customer will keep it.",
  "orders_subform_rentalItem_introduction.pcm"
);
register(
  "What product is being rented out?",
  "orders_subform_rentalItem_product.pcm"
);
register(
  "How many are they renting?",
  "orders_subform_rentalItem_quantity.pcm"
);
register(
  "How long are they renting this for? Enter the duration in days.",
  "orders_subform_rentalitem_rentalduraiton_1.pcm"
);

// subForms: washingItem
register(
  "For Washing orders, this section is used to capture the items the customer wants cleaned. Simply choose the product and enter the quantity being sent for washing.",
  "orders_subform_washitems_introduction.pcm"
);
register(
  "Which product did they send to be washed?",
  "orders_subform_washitem_product_1.pcm"
);
register(
  "How many of these items did they send?",
  "orders_subform_washitem_quantity.pcm"
);

// System Helpers
register(
  "I'll clear the demo data now.",
  "orders_clear_demo_data.pcm"
);
register(
  "This field is read-only. It gets filled automatically when you save.",
  "orders_readonly_field.pcm"
);
register(
  "The products have been loaded automatically based on the customer's agreement.",
  "orders_auto_populated_products.pcm"
);
register(
  "I'll skip filling this field — no demo value is configured.",
  "orders_nodemo_value.pcm"
);
register(
  "I'm having trouble with this form. The walkthrough will stop now. Please try again later.",
  "orders_walkthrough_abort.pcm"
);

export class NarrationService {
  private statusAwaiter: StatusAwaiter;

  constructor(statusAwaiter: StatusAwaiter) {
    this.statusAwaiter = statusAwaiter;
  }

  async speak(
    session: WalkthroughSession,
    text: string,
    languageCode: string = "en",
    messageId?: string
  ): Promise<string> {
    const id = messageId || crypto.randomUUID();
    
    const state = { interrupted: false };
    activeNarrations.set(session.sessionId, state);

    // Look for pre-recorded audio file matching the normalized text prompt
    const normalized = normalizeText(text);
    const audioFilename = AUDIO_MAP.get(normalized);

    if (audioFilename) {
      console.log(`[NarrationService] Cache hit! Streaming pre-recorded audio: ${audioFilename} for prompt: "${text.substring(0, 40)}..."`);
      try {
        const filePath = join(__dirname, "../../voicefiles_pcm", audioFilename);
        const buffer = await fsPromises.readFile(filePath);

        // Since it's a raw PCM file, we stream the entire buffer directly (no headers to strip)
        const rawPCM = buffer;

        // Pacing parameters matching 22050Hz Mono 16-bit PCM:
        // 8192 bytes = 4096 samples. 4096 / 22050 Hz = ~185.7ms.
        const CHUNK_SIZE = 8192;
        const DELAY_MS = 185;

        let offset = 0;
        while (offset < rawPCM.length) {
          if (state.interrupted) {
            console.log(`[NarrationService] Audio playback interrupted. Stopping stream for ${id}.`);
            break;
          }

          const end = Math.min(offset + CHUNK_SIZE, rawPCM.length);
          const chunk = rawPCM.subarray(offset, end);
          const isDone = end === rawPCM.length;

          connectionManager.send(session.sessionId, {
            type: "tts_audio",
            audio: chunk.toString("base64"),
            messageId: id,
            done: isDone,
          });

          offset = end;
          if (!isDone) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }

        if (activeNarrations.get(session.sessionId) === state) {
          activeNarrations.delete(session.sessionId);
        }
        return id;
      } catch (err) {
        console.warn(`[NarrationService] Failed to read pre-recorded file ${audioFilename}. Falling back to live ElevenLabs TTS. Error:`, err);
      }
    }

    try {
      const { synthesizeStream } = await import("../services/ttsService.js");
      await synthesizeStream(text, languageCode, (base64Chunk, isDone) => {
        if (state.interrupted) {
           return;
        }
        connectionManager.send(session.sessionId, {
          type: "tts_audio",
          audio: base64Chunk,
          messageId: id,
          done: isDone,
        });
      });
      if (activeNarrations.get(session.sessionId) === state) {
         activeNarrations.delete(session.sessionId);
      }
      return id;
    } catch (err) {
      console.error("[NarrationService] TTS synthesis failed:", err);
      // Send an empty complete chunk so the client queue doesn't hang
      connectionManager.send(session.sessionId, {
        type: "tts_audio",
        audio: "",
        messageId: id,
        done: true,
      });
      throw err;
    }
  }

  async speakAndWait(
    session: WalkthroughSession,
    text: string,
    languageCode: string = "en",
    messageId?: string
  ): Promise<string> {
    let id: string;
    try {
      id = await this.speak(session, text, languageCode, messageId);
    } catch (err) {
      // Synthesis failed (e.g. ElevenLabs API key not configured or rate-limited).
      // Return ID immediately without waiting for playback.
      return messageId || crypto.randomUUID();
    }

    try {
      await this.statusAwaiter.waitForStatus(
        session,
        "tts_playback_complete",
        15000,
        (data) => data.messageId === id
      );
    } catch (err) {
      console.warn(`[NarrationService] TTS playback timeout for ${id}, continuing...`);
    }

    return id;
  }
}
