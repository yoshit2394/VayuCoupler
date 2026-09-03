/**
 * Audio Feedback - Completely Disabled per User Request
 * All methods are silent no-ops to ensure 100% quiet, lightweight execution.
 */
class SoundFeedback {
  constructor() {
    this.enabled = false;
  }

  init() {}
  buildBuffers() {}
  playBuffer() {}
  playTap() {}
  playTab() {}
  playStationSelect() {}
  playSlider() {}
  playActionAcknowledge() {}
  playModalOpen() {}
  playChime() {}
}

export const sound = new SoundFeedback();

