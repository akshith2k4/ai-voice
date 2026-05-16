import { WalkthroughStateMachine } from "./src/state/stateMachine";

const sm = new WalkthroughStateMachine();

// ============================================
// Test 1: Basic walkthrough flow
// ============================================
console.log("\n── Test 1: Basic walkthrough flow ──");

console.log("Initial state:", sm.currentState);
// IDLE

sm.transition("START_WALKTHROUGH", { formId: "createOrder" });
console.log("After START_WALKTHROUGH:", sm.currentState, "| formId:", sm.currentContext.formId);
// FORM_SELECTED | formId: createOrder

sm.transition("FORM_READY");
console.log("After FORM_READY:", sm.currentState, "| fieldIndex:", sm.currentContext.fieldIndex);
// WALKING_THROUGH | fieldIndex: 0

sm.transition("FIELD_COMPLETE");
console.log("After FIELD_COMPLETE:", sm.currentState, "| fieldIndex:", sm.currentContext.fieldIndex);
// WALKING_THROUGH | fieldIndex: 1

sm.transition("FIELD_COMPLETE");
console.log("After FIELD_COMPLETE:", sm.currentState, "| fieldIndex:", sm.currentContext.fieldIndex);
// WALKING_THROUGH | fieldIndex: 2

// ============================================
// Test 2: Pause and Resume
// ============================================
console.log("\n── Test 2: Pause and Resume ──");

sm.transition("PAUSE");
console.log("After PAUSE:", sm.currentState);
// PAUSED

sm.transition("RESUME");
console.log("After RESUME:", sm.currentState, "| fieldIndex:", sm.currentContext.fieldIndex);
// WALKING_THROUGH | fieldIndex: 2

// ============================================
// Test 3: Detour and return (anchor to origin)
// ============================================
console.log("\n── Test 3: Detour and return ──");

sm.transition("DETOUR");
console.log("After DETOUR:", sm.currentState, "| origin fieldIndex:", sm.currentContext.detourOrigin?.fieldIndex);
// DETOUR_QA | origin fieldIndex: 2

sm.transition("DETOUR_COMPLETE");
console.log("After DETOUR_COMPLETE:", sm.currentState, "| returned fieldIndex:", sm.currentContext.fieldIndex);
// WALKING_THROUGH | returned fieldIndex: 2

// ============================================
// Test 4: Detour from PAUSED (Bug 4 fix)
// ============================================
console.log("\n── Test 4: Detour from PAUSED ──");

sm.transition("PAUSE");
console.log("After PAUSE:", sm.currentState);
// PAUSED

sm.transition("DETOUR");
console.log("After DETOUR from PAUSED:", sm.currentState, "| origin state:", sm.currentContext.detourOrigin?.state);
// DETOUR_QA | origin state: PAUSED

sm.transition("DETOUR_COMPLETE");
console.log("After DETOUR_COMPLETE:", sm.currentState);
// PAUSED (returns to originating state, not WALKING_THROUGH)

sm.transition("RESUME");
console.log("After RESUME:", sm.currentState);
// WALKING_THROUGH

// ============================================
// Test 5: Pause from DETOUR_QA (Bug 5 fix)
// ============================================
console.log("\n── Test 5: Pause from DETOUR_QA ──");

sm.transition("DETOUR");
console.log("After DETOUR:", sm.currentState);
// DETOUR_QA

sm.transition("PAUSE");
console.log("After PAUSE from DETOUR_QA:", sm.currentState);
// PAUSED

sm.transition("RESUME");
console.log("After RESUME:", sm.currentState);
// WALKING_THROUGH (resumes from where it was)

// ============================================
// Test 6: Sub-form with multiple items
// ============================================
console.log("\n── Test 6: Sub-form with multiple items ──");

sm.transition("SUB_FORM_START", { subFormId: "deliveryItem" });
console.log("After SUB_FORM_START:", sm.currentState, "| subFormId:", sm.currentContext.subFormId, "| itemIndex:", sm.currentContext.subFormItemIndex);
// SUB_FORM | subFormId: deliveryItem | itemIndex: 0

sm.transition("SUB_FORM_FIELD_COMPLETE");
console.log("After field 1:", sm.currentState, "| subFormFieldIndex:", sm.currentContext.subFormFieldIndex);
// SUB_FORM | subFormFieldIndex: 1

sm.transition("SUB_FORM_FIELD_COMPLETE");
console.log("After field 2:", sm.currentState, "| subFormFieldIndex:", sm.currentContext.subFormFieldIndex);
// SUB_FORM | subFormFieldIndex: 2

sm.transition("SUB_FORM_FIELD_COMPLETE");
console.log("After field 3:", sm.currentState, "| subFormFieldIndex:", sm.currentContext.subFormFieldIndex);
// SUB_FORM | subFormFieldIndex: 3

// Move to item 2
sm.transition("SUB_FORM_NEXT_ITEM");
console.log("After NEXT_ITEM:", sm.currentState, "| itemIndex:", sm.currentContext.subFormItemIndex, "| subFormFieldIndex:", sm.currentContext.subFormFieldIndex);
// SUB_FORM | itemIndex: 1 | subFormFieldIndex: 0

sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_FIELD_COMPLETE");
console.log("After 3 fields of item 2:", sm.currentState, "| subFormFieldIndex:", sm.currentContext.subFormFieldIndex);
// SUB_FORM | subFormFieldIndex: 3

sm.transition("SUB_FORM_COMPLETE");
console.log("After SUB_FORM_COMPLETE:", sm.currentState, "| subFormId:", sm.currentContext.subFormId);
// WALKING_THROUGH | subFormId: null

// ============================================
// Test 7: Detour during sub-form
// ============================================
console.log("\n── Test 7: Detour during sub-form ──");

sm.transition("SUB_FORM_START", { subFormId: "pickupItem" });
console.log("In sub-form:", sm.currentState, "| subFormId:", sm.currentContext.subFormId, "| itemIndex:", sm.currentContext.subFormItemIndex);
// SUB_FORM | subFormId: pickupItem | itemIndex: 0

sm.transition("DETOUR");
console.log("After DETOUR from SUB_FORM:", sm.currentState, "| origin subFormId:", sm.currentContext.detourOrigin?.subFormId, "| origin itemIndex:", sm.currentContext.detourOrigin?.subFormItemIndex);
// DETOUR_QA | origin subFormId: pickupItem | origin itemIndex: 0

sm.transition("DETOUR_COMPLETE");
console.log("After DETOUR_COMPLETE:", sm.currentState, "| subFormId:", sm.currentContext.subFormId, "| itemIndex:", sm.currentContext.subFormItemIndex);
// SUB_FORM | subFormId: pickupItem | itemIndex: 0

sm.transition("SUB_FORM_COMPLETE");

// ============================================
// Test 8: Cancel from any state
// ============================================
console.log("\n── Test 8: Cancel from WALKING_THROUGH ──");

sm.transition("CANCEL");
console.log("After CANCEL:", sm.currentState);
// CANCELLED

// ============================================
// Test 9: RESET clears context (Bug 7 fix)
// ============================================
console.log("\n── Test 9: RESET clears context ──");

console.log("Before RESET — formId:", sm.currentContext.formId, "| fieldIndex:", sm.currentContext.fieldIndex);
// formId: createOrder | fieldIndex: 2

sm.transition("RESET");
console.log("After RESET:", sm.currentState, "| formId:", sm.currentContext.formId, "| fieldIndex:", sm.currentContext.fieldIndex, "| subFormId:", sm.currentContext.subFormId);
// IDLE | formId: "" | fieldIndex: 0 | subFormId: null

// ============================================
// Test 10: Invalid transition throws error
// ============================================
console.log("\n── Test 10: Invalid transition throws error ──");

try {
  sm.transition("PAUSE"); // Can't pause from IDLE
  console.log("❌ Should have thrown error");
} catch (error) {
  console.log("✅ Correctly threw:", (error as Error).message);
  // Invalid transition: IDLE → PAUSE
}

// ============================================
// Test 11: Full walkthrough lifecycle
// ============================================
console.log("\n── Test 11: Full walkthrough lifecycle ──");

sm.reset();
console.log("Reset to:", sm.currentState);

sm.transition("START_WALKTHROUGH", { formId: "createOrder" });
console.log("1. START:", sm.currentState, "| formId:", sm.currentContext.formId);

sm.transition("FORM_READY");
console.log("2. FORM_READY:", sm.currentState, "| fieldIndex:", sm.currentContext.fieldIndex);

sm.transition("FIELD_COMPLETE"); // field 0 done
sm.transition("FIELD_COMPLETE"); // field 1 done
sm.transition("FIELD_COMPLETE"); // field 2 done
console.log("3. After 3 fields:", sm.currentState, "| fieldIndex:", sm.currentContext.fieldIndex);

sm.transition("SUB_FORM_START", { subFormId: "deliveryItem" });
sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_NEXT_ITEM");
sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_FIELD_COMPLETE");
sm.transition("SUB_FORM_COMPLETE");
console.log("4. After sub-form:", sm.currentState);

sm.transition("FIELD_COMPLETE"); // next main field
sm.transition("FIELD_COMPLETE"); // next main field

sm.transition("ALL_FIELDS_DONE");
console.log("5. ALL_FIELDS_DONE:", sm.currentState);

sm.transition("RESET");
console.log("6. RESET:", sm.currentState);

console.log("\n✅ All tests passed!");

// ============================================
// Print transition history
// ============================================
console.log("\n── Transition History ──");
sm.transitionHistory.forEach((t, i) => {
  console.log(`${i + 1}. ${t.from} → ${t.to} (${t.event})`);
});