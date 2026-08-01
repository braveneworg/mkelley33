/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/** A rejected submission always carries the message to show the user. */
export interface ActionFailure {
  error: string;
  success: false;
}

/** Acceptance says nothing beyond "it went through" — deliberately uniform,
 * so a spam submission and a real one are indistinguishable to the client. */
export interface ActionSuccess {
  success: true;
}

/**
 * Discriminated so `error` is present exactly when it is meaningful. As an
 * optional field it forced every call site to invent a fallback string, and
 * those fallbacks drifted from the messages the actions actually return.
 */
export type ActionResult = ActionFailure | ActionSuccess;
