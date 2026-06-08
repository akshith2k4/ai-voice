import type { WalkthroughSession, SubFormSchema } from "./sessionManager.js";
import { resolveDemoValue, FieldSkipError } from "./evaluator.js";

const TIMEOUTS = {
  GO_TO_FIELD: 4000,
  FILL_FIELD: 5000,
  ADD_ITEM: 3000,
  EXPLAIN_DISPLAY: 100,
  FIELD_RENDER_WAIT: 300,
};

export interface WalkthroughDriverInterface {
  sendTool(
    session: WalkthroughSession,
    tool: string,
    args: Record<string, unknown>,
    expectedEvent: string | null,
    timeout: number
  ): Promise<any>;
  retryOperation(
    session: WalkthroughSession,
    operation: () => Promise<void>,
    fieldKey: string
  ): Promise<void>;
  yieldToInterrupts(session: WalkthroughSession): Promise<void>;
  checkCancelled(session: WalkthroughSession): void;
  wait(ms: number): Promise<void>;
}

export async function processSubForm(
  driver: WalkthroughDriverInterface,
  session: WalkthroughSession,
  subForm: SubFormSchema
): Promise<void> {
  const { stateMachine } = session;
  stateMachine.transition("SUB_FORM_START", { subFormId: subForm.id });

  if (subForm.explanation) {
    await driver.sendTool(
      session,
      "respond",
      { message: subForm.explanation, tts: session.ttsEnabled },
      null,
      0
    );
    await driver.wait(TIMEOUTS.EXPLAIN_DISPLAY);
  }

  if (subForm.autoPopulated) {
    await processAutoPopulatedSubForm(driver, session, subForm);
  } else if (subForm.copyFrom) {
    const { subFormId, whenFieldEquals, checkboxLabel } = subForm.copyFrom;
    const shouldCopy = !whenFieldEquals ||
      session.filledValues.get(whenFieldEquals.field) === whenFieldEquals.value;

    if (shouldCopy) {
      await processCopySubForm(driver, session, subForm, checkboxLabel);
    } else {
      await processManualSubForm(driver, session, subForm);
    }
  } else {
    await processManualSubForm(driver, session, subForm);
  }

  stateMachine.transition("SUB_FORM_COMPLETE");
}

async function processAutoPopulatedSubForm(
  driver: WalkthroughDriverInterface,
  session: WalkthroughSession,
  subForm: SubFormSchema
): Promise<void> {
  const { stateMachine } = session;
  console.log(`[Driver] Auto-populated sub-form: ${subForm.id} — items already in DOM`);

  await driver.sendTool(
    session,
    "respond",
    {
      message: "The products have been loaded automatically based on the customer's agreement.",
      tts: session.ttsEnabled,
    },
    null,
    0
  );
  await driver.wait(TIMEOUTS.EXPLAIN_DISPLAY);

  for (let itemIndex = 0; itemIndex < subForm.demoItemCount; itemIndex++) {
    driver.checkCancelled(session);
    await driver.yieldToInterrupts(session);
    if (itemIndex > 0) {
      if (subForm.explanationForMultiple) {
        await driver.sendTool(
          session,
          "respond",
          { message: subForm.explanationForMultiple, tts: session.ttsEnabled },
          null,
          0
        );
        await driver.wait(TIMEOUTS.EXPLAIN_DISPLAY);
      }
      stateMachine.transition("SUB_FORM_NEXT_ITEM");
    }

    for (const field of subForm.fields) {
      driver.checkCancelled(session);
      await driver.yieldToInterrupts(session);

      try {
        await driver.retryOperation(
          session,
          async () => {
            await driver.sendTool(
              session,
              "go_to_field",
              {
                fieldKey: field.key,
                label: field.label,
                subFormId: subForm.id,
                itemIndex: itemIndex,
              },
              "field_reached",
              TIMEOUTS.GO_TO_FIELD
            );
          },
          field.key
        );

        await driver.sendTool(
          session,
          "explain_field",
          {
            fieldKey: field.key,
            text: field.explanation,
            tts: session.ttsEnabled,
          },
          null,
          0
        );
        await driver.wait(TIMEOUTS.EXPLAIN_DISPLAY);

        if (field.autoFilled) {
          await driver.sendTool(
            session,
            "respond",
            {
              message: "This field was already filled automatically for you.",
              tts: session.ttsEnabled,
            },
            null,
            0
          );
          await driver.wait(200);
          stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
          continue;
        }

        await driver.yieldToInterrupts(session);

        await driver.retryOperation(
          session,
          async () => {
            await driver.sendTool(
              session,
              "fill_field",
              {
                fieldKey: field.key,
                label: field.label,
                type: field.type,
                value: String(resolveDemoValue(field, session.filledValues) ?? ""),
                subFormId: subForm.id,
                itemIndex: itemIndex,
              },
              "field_filled",
              TIMEOUTS.FILL_FIELD
            );
          },
          field.key
        );

        const pauseAfterFill = field.pauseAfterFill || 200;
        await driver.wait(pauseAfterFill);

        stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
        session.filledValues.set(
          `${subForm.id}_${itemIndex}_${field.key}`,
          resolveDemoValue(field, session.filledValues)
        );
      } catch (error) {
        if (error instanceof FieldSkipError) {
          console.log(`[Driver] Skipping sub-form field "${field.key}" — fill failed`);
          stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
          continue;
        }
        throw error;
      }
    }
  }
}

async function processManualSubForm(
  driver: WalkthroughDriverInterface,
  session: WalkthroughSession,
  subForm: SubFormSchema
): Promise<void> {
  const { stateMachine } = session;
  console.log(`[Driver] Manual sub-form: ${subForm.id} — adding ${subForm.demoItemCount} item(s)`);

  for (let itemIndex = 0; itemIndex < subForm.demoItemCount; itemIndex++) {
    driver.checkCancelled(session);
    await driver.yieldToInterrupts(session);
    await driver.retryOperation(
      session,
      async () => {
        await driver.sendTool(
          session,
          "add_item",
          { subFormId: subForm.id, triggerText: subForm.triggerText },
          "item_added",
          TIMEOUTS.ADD_ITEM
        );
      },
      `${subForm.id}_addItem_${itemIndex}`
    );

    await driver.wait(TIMEOUTS.FIELD_RENDER_WAIT);

    if (itemIndex > 0 && subForm.explanationForMultiple) {
      await driver.sendTool(
        session,
        "respond",
        { message: subForm.explanationForMultiple, tts: session.ttsEnabled },
        null,
        0
      );
      await driver.wait(TIMEOUTS.EXPLAIN_DISPLAY);
      stateMachine.transition("SUB_FORM_NEXT_ITEM");
    }

    for (const field of subForm.fields) {
      driver.checkCancelled(session);
      await driver.yieldToInterrupts(session);

      try {
        await driver.retryOperation(
          session,
          async () => {
            await driver.sendTool(
              session,
              "go_to_field",
              {
                fieldKey: field.key,
                label: field.label,
                subFormId: subForm.id,
                itemIndex: itemIndex,
              },
              "field_reached",
              TIMEOUTS.GO_TO_FIELD
            );
          },
          field.key
        );

        await driver.sendTool(
          session,
          "explain_field",
          {
            fieldKey: field.key,
            text: field.explanation,
            tts: session.ttsEnabled,
          },
          null,
          0
        );
        await driver.wait(TIMEOUTS.EXPLAIN_DISPLAY);

        await driver.yieldToInterrupts(session);

        await driver.retryOperation(
          session,
          async () => {
            await driver.sendTool(
              session,
              "fill_field",
              {
                fieldKey: field.key,
                label: field.label,
                type: field.type,
                value: String(resolveDemoValue(field, session.filledValues) ?? ""),
                subFormId: subForm.id,
                itemIndex: itemIndex,
              },
              "field_filled",
              TIMEOUTS.FILL_FIELD
            );
          },
          field.key
        );

        const pauseAfterFill = field.pauseAfterFill || 200;
        await driver.wait(pauseAfterFill);

        stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
        session.filledValues.set(
          `${subForm.id}_${itemIndex}_${field.key}`,
          resolveDemoValue(field, session.filledValues)
        );
      } catch (error) {
        if (error instanceof FieldSkipError) {
          console.log(`[Driver] Skipping sub-form field "${field.key}" — fill failed`);
          stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
          continue;
        }
        throw error;
      }
    }
  }
}

async function processCopySubForm(
  driver: WalkthroughDriverInterface,
  session: WalkthroughSession,
  subForm: SubFormSchema,
  checkboxLabel: string
): Promise<void> {
  console.log(`[Driver] Sub-form ${subForm.id} — using copy checkbox`);

  await driver.sendTool(
    session,
    "respond",
    {
      message: subForm.copyFrom?.copyExplanation || `These items can be copied from ${subForm.copyFrom?.subFormId}.`,
      tts: session.ttsEnabled,
    },
    null,
    0
  );

  await driver.retryOperation(
    session,
    async () => {
      await driver.sendTool(
        session,
        "click_checkbox",
        {
          fieldKey: `copy_${subForm.copyFrom?.subFormId}`,
          labelText: checkboxLabel,
        },
        "checkbox_clicked",
        TIMEOUTS.FILL_FIELD
      );
    },
    `copy_${subForm.id}`
  );

  await driver.sendTool(
    session,
    "respond",
    {
      message: "I've checked the copy option to automatically copy items.",
      tts: session.ttsEnabled,
    },
    null,
    0
  );
  await driver.wait(TIMEOUTS.EXPLAIN_DISPLAY);
}
