import { afterEach, describe, expect, it, vi } from "vitest";
import { SOUND_CUES, StageAudio } from "./stage-audio";

function audioEnvironment() {
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  const node = () => {
    const source = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: undefined, gain: parameter(), frequency: parameter() };
    source.connect.mockImplementation((destination) => destination);
    return source;
  };
  const context = {
    state: "running", currentTime: 10, sampleRate: 8000, destination: {},
    createGain: vi.fn(node), createOscillator: vi.fn(node), createBiquadFilter: vi.fn(node), createBufferSource: vi.fn(node),
    createBuffer: vi.fn((_channels, length) => ({ getChannelData: () => new Float32Array(length) })),
    resume: vi.fn(async () => { context.state = "running"; }),
    suspend: vi.fn(async () => { context.state = "suspended"; }),
    close: vi.fn(async () => { context.state = "closed"; }),
  };
  const constructor = vi.fn(function () { return context; });
  vi.stubGlobal("window", { AudioContext: constructor });
  vi.stubGlobal("AudioContext", constructor);
  return { context, constructor };
}

afterEach(() => vi.unstubAllGlobals());

describe("temporary stage sound cues", () => {
  it("does not create or play audio before a user gesture unlocks it", () => {
    const environment = audioEnvironment();
    const audio = new StageAudio();
    audio.play("impact");
    expect(environment.constructor).not.toHaveBeenCalled();
    audio.unlock();
    expect(environment.constructor).toHaveBeenCalledTimes(1);
    expect(environment.context.createOscillator).not.toHaveBeenCalled();
    expect(environment.context.createGain.mock.results[0].value.gain.value).toBe(0.18);
  });

  it("schedules distinct short impact and call cues with finite endings", () => {
    const { context } = audioEnvironment();
    const audio = new StageAudio();
    audio.unlock();
    audio.play("impact");
    const impact = context.createOscillator.mock.results[0].value;
    expect(impact.frequency.setValueAtTime).toHaveBeenCalledWith(SOUND_CUES.impact.start, 10);
    expect(impact.stop).toHaveBeenCalledWith(10 + SOUND_CUES.impact.duration);
    expect(context.createBufferSource).toHaveBeenCalledTimes(1);
    audio.play("call");
    const call = context.createOscillator.mock.results[1].value;
    expect(call.frequency.setValueAtTime).toHaveBeenCalledWith(SOUND_CUES.call.start, 10);
    expect(call.stop).toHaveBeenCalledWith(10 + SOUND_CUES.call.duration);
    expect(context.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it("mutes immediately, suppresses muted events and resumes only future cues", () => {
    const { context } = audioEnvironment();
    const audio = new StageAudio();
    audio.unlock();
    audio.play("call");
    const voice = context.createOscillator.mock.results[0].value;
    audio.setEnabled(false);
    expect(voice.stop).toHaveBeenCalledTimes(2);
    audio.play("impact");
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    audio.setEnabled(true);
    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    audio.play("call");
    expect(context.createOscillator).toHaveBeenCalledTimes(2);
  });

  it("pauses with the encyclopedia and stops outstanding sources on reset/disposal", () => {
    const { context } = audioEnvironment();
    const audio = new StageAudio();
    audio.unlock();
    audio.pause();
    expect(context.suspend).toHaveBeenCalledTimes(1);
    audio.play("call");
    expect(context.createOscillator).not.toHaveBeenCalled();
    audio.resume();
    expect(context.resume).toHaveBeenCalledTimes(1);
    audio.play("call");
    audio.stop();
    expect(context.createOscillator.mock.results[0].value.stop).toHaveBeenCalledTimes(2);
    audio.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("continues silently when browser audio is unavailable", () => {
    vi.stubGlobal("window", {});
    const audio = new StageAudio();
    expect(() => { audio.unlock(); audio.play("impact"); audio.pause(); audio.resume(); audio.dispose(); }).not.toThrow();
  });
});
