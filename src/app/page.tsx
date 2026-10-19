"use client";
import { useEffect, useRef, useState } from "react";
import { get, set, getMany, setMany } from "idb-keyval";
import {
  ArrowUpRight,
  ArrowRight,
  Film,
  Layers2,
  SlidersHorizontal,
  Check,
  X,
  Play,
  Pause,
  Download,
  RotateCcw,
  Star,
  Camera,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  MockProvider,
  models,
  presets,
  estimateCost,
  availableCredits,
  restoreJobs,
  type Generation,
  type Recipe,
} from "../lib/core";
import { draw, record, recordingType } from "../lib/render";
import { withStorageTimeout } from "../lib/storage";
const provider = new MockProvider();
const initial: Recipe = {
  prompt: "",
  modelId: "balanced",
  cameraPresetId: "push",
  durationSec: 4,
  aspect: "16:9",
  resolution: "720p",
};
const motionSamples = Object.fromEntries(
  presets.map((p) => [
    p.id,
    {
      ...initial,
      prompt: "A quiet mountain landscape at dusk",
      cameraPresetId: p.id,
    },
  ]),
) as Record<string, Recipe>;
function Motion({
  recipe,
  clock,
  still = false,
  thumbnail = false,
}: {
  recipe: Recipe;
  clock?: number;
  still?: boolean;
  thumbnail?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let frame = 0;
    const start = performance.now(),
      reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      draw(
        c,
        recipe,
        clock !== undefined
          ? clock
          : still || reduce
            ? 0
            : (performance.now() - start) % (recipe.durationSec * 1000),
      );
      if (clock === undefined && !still && !reduce)
        frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [recipe, clock, still]);
  const size = thumbnail ? 160 : 640;
  const dimensions =
    recipe.aspect === "9:16"
      ? [Math.round((size * 9) / 16), size]
      : recipe.aspect === "1:1"
        ? [size, size]
        : [size, Math.round((size * 9) / 16)];
  return (
    <canvas
      ref={ref}
      width={dimensions[0]}
      height={dimensions[1]}
      role="img"
      aria-hidden={thumbnail || undefined}
      aria-label={`Procedural mock landscape, ${presets.find((p) => p.id === recipe.cameraPresetId)?.name}`}
      style={{ aspectRatio: recipe.aspect.replace(":", "/") }}
    />
  );
}
export default function Home() {
  const [recipe, setRecipe] = useState<Recipe>(initial),
    [jobs, setJobs] = useState<Generation[]>([]),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("all"),
    [view, setView] = useState<Generation | null>(null),
    [parent, setParent] = useState<string>(),
    [selected, setSelected] = useState<string[]>([]),
    [compare, setCompare] = useState(false),
    [playing, setPlaying] = useState(false),
    [clock, setClock] = useState(0),
    [exporting, setExporting] = useState(false),
    [canRecord, setCanRecord] = useState(false),
    [saving, setSaving] = useState(false),
    [storageError, setStorageError] = useState(""),
    [budgetExemptIds, setBudgetExemptIds] = useState<string[]>([]);
  const file = useRef<HTMLInputElement>(null),
    promptRef = useRef<HTMLTextAreaElement>(null),
    dialogRef = useRef<HTMLDialogElement>(null),
    dialogOpener = useRef<HTMLElement | null>(null),
    closeResultButton = useRef<HTMLButtonElement>(null),
    storageAvailable = useRef(false),
    saveQueue = useRef<Promise<void>>(Promise.resolve());
  const total = 240,
    remaining = availableCredits(total, jobs, budgetExemptIds),
    spent = jobs
      .filter((j) => j.status === "done" && !budgetExemptIds.includes(j.id))
      .reduce((s, j) => s + j.costCredits, 0),
    cost = estimateCost(recipe.modelId, recipe.durationSec, recipe.resolution),
    active = jobs.filter((j) => ["queued", "generating"].includes(j.status)),
    done = jobs.filter((j) => j.status === "done");
  useEffect(() => {
    let disposed = false;
    setCanRecord(!!recordingType());
    withStorageTimeout(() => getMany<unknown>(["slate-jobs", "slate-budget-exemptions"]))
      .then(([data, exemptions]) => {
        const restored = restoreJobs(data);
        if (exemptions !== undefined && (!Array.isArray(exemptions) || !exemptions.every((id) => typeof id === "string"))) throw new Error("Unreadable demo budget");
        if (disposed) return;
        setJobs(restored);
        setBudgetExemptIds((exemptions as string[] | undefined) ?? []);
        storageAvailable.current = true;
      })
      .catch(() => {
        if (!disposed)
          setStorageError(
            "Browser storage is unavailable or could not be read. This session's takes will not survive a refresh. Existing saved data has not been overwritten.",
          );
      })
      .finally(() => {
        if (!disposed) setReady(true);
      });
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!ready || !storageAvailable.current) return;
    let disposed = false;
    setSaving(true);
    saveQueue.current = saveQueue.current
      .then(async () => {
        if (!storageAvailable.current) return;
        try {
          await withStorageTimeout(() => setMany([["slate-jobs", jobs], ["slate-budget-exemptions", budgetExemptIds]]));
        } catch {
          storageAvailable.current = false;
          setStorageError(
            "Could not save your takes. This session's changes may be lost on refresh. Check browser storage before reloading.",
          );
        }
      })
      .finally(() => {
        if (!disposed) setSaving(false);
      });
    return () => {
      disposed = true;
    };
  }, [jobs, ready, budgetExemptIds]);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setJobs((old) => {
          let changed = false;
          const next = old.map((j) => {
            if (!["queued", "generating"].includes(j.status)) return j;
            const state = provider.getStatus(j);
            if (state.status === j.status && state.progress === j.progress)
              return j;
            changed = true;
            return {
              ...j,
              ...state,
              error:
                state.status === "failed"
                  ? [
                      "The model is overloaded. Please try again.",
                      "The render timed out. Please retry.",
                      "The content filter stopped this attempt. Try adjusting your prompt.",
                    ][Math.floor(j.delay) % 3]
                  : undefined,
            };
          });
          return changed ? next : old;
        }),
      500,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const start = performance.now() - clock;
    const tick = () => {
      setClock(
        (performance.now() - start) %
          ((view?.recipe.durationSec ??
            Math.max(
              ...jobs
                .filter((j) => selected.includes(j.id))
                .map((j) => j.recipe.durationSec),
              4,
            )) *
            1000),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, view, compare]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (view || compare) {
      if (!dialog.open) {
        dialogOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
        closeResultButton.current?.focus();
      }
    } else {
      dialog.close();
      const opener = dialogOpener.current;
      dialogOpener.current = null;
      if (opener) (opener.isConnected ? opener : promptRef.current)?.focus();
      setPlaying(false);
      setClock(0);
    }
  }, [view, compare]);
  function change<K extends keyof Recipe>(key: K, value: Recipe[K]) {
    setRecipe((r) => ({ ...r, [key]: value }));
  }
  function generate(r = recipe, p = parent) {
    if (!ready) return;
    if (!r.prompt.trim()) {
      promptRef.current?.focus();
      return;
    }
    if (estimateCost(r.modelId, r.durationSec, r.resolution) > remaining) {
      setNotice("This take exceeds your available session budget.");
      return;
    }
    const job = provider.submit(r, p);
    setJobs((old) => [job, ...old]);
    setNotice("Your take is queued. You can keep creating.");
    setParent(undefined);
  }
  function resetDemoCredits() {
    if (!ready || !window.confirm("Restore 240 demo credits? All takes stay saved. Existing and running takes will not spend the new credits.")) return;
    setBudgetExemptIds(jobs.map((job) => job.id));
    setNotice("Demo budget reset to 240 credits. All takes kept.");
  }
  function remix(j: Generation) {
    setRecipe({ ...j.recipe });
    setParent(j.id);
    setView(null);
    setCompare(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => promptRef.current?.focus(), 0);
    setNotice("Recipe loaded. Make it your own, then generate another take.");
  }
  async function download(j: Generation) {
    setExporting(true);
    try {
      let blob: Blob | undefined;
      try {
        if (storageAvailable.current)
          blob = await withStorageTimeout(
            () => get<Blob>("clip-" + j.id),
            1000,
          );
      } catch {
        /* Export works without a cache. */
      }
      if (!blob) {
        blob = await record(j.recipe);
        try {
          if (storageAvailable.current)
            await withStorageTimeout(() => set("clip-" + j.id, blob), 1000);
        } catch {
          /* Quota errors must not discard a recorded take. */
        }
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `slate-${j.id.slice(0, 8)}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNotice("WebM exported. Your take is ready to keep.");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }
  async function upload(f?: File) {
    if (!f) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
      f.size > 3 * 1024 * 1024
    ) {
      setNotice("Choose a PNG, JPEG or WebP smaller than 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => change("referenceImage", String(reader.result));
    reader.onerror = () =>
      setNotice("The image could not be read. Please try another.");
    reader.readAsDataURL(f);
  }
  function toggle(id: string) {
    setSelected((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 2
          ? [...old, id]
          : [old[1], id],
    );
  }
  function keeper(j: Generation) {
    setJobs((old) =>
      old.map((x) => (x.id === j.id ? { ...x, isKeeper: !x.isKeeper } : x)),
    );
    if (view?.id === j.id) setView({ ...j, isKeeper: !j.isKeeper });
  }
  const visible =
    tab === "keepers"
      ? done.filter((j) => j.isKeeper)
      : tab === "active"
        ? active
        : jobs;
  const parentTake = view?.parentId ? jobs.find((job) => job.id === view.parentId) : undefined;
  return (
    <>
      <a href="#create" className="skip">
        Skip to Create
      </a>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Slate home">
          <span className="brandmark" aria-hidden="true">
            <Film size={20} />
          </span>
          <span>slate</span>
          <span className="beta">WORKSPACE</span>
        </a>
        <nav aria-label="Workspace">
          <a href="#create" className="nav-active">
            Create
          </a>
          <a href="#library">
            My takes <span>{done.length}</span>
          </a>
        </nav>
        <div className="budget" role="img" aria-label={`${remaining} credits left`}>
          <span className="budget-dot" />
          <span>
            {remaining} <span className="muted">credits left</span>
          </span>
          <span className="budget-meter">
            <i style={{ width: `${(remaining / total) * 100}%` }} />
          </span>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">YOUR NEXT GOOD IDEA STARTS HERE</div>
            <h1>
              A little idea.
              <br />
              <span>A moving picture.</span>
            </h1>
            <p>Find the frame. Set it in motion. Make it yours.</p>
          </div>
          <div className="intro-note">
            <span className="tiny-star">✳</span>
            <p>
              A quiet space for
              <br />
              your next big thing.
            </p>
          </div>
        </div>
        <section id="create" className="studio" aria-label="Create a video">
          <div className="composer">
            <div className="section-top">
              <h2>
                <Sparkles size={15} /> The idea
              </h2>
              <span className="label-tag">MOCK STUDIO</span>
            </div>
            <label className="sr-only" htmlFor="prompt">
              Describe your scene
            </label>
            <textarea
              id="prompt"
              ref={promptRef}
              maxLength={2000}
              placeholder="A misty coastline at dawn. Soft light catches the waves as the camera moves slowly toward the horizon…"
              value={recipe.prompt}
              onChange={(e) => change("prompt", e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (ready) generate();
                }
              }}
            />
            <div className="prompt-bottom">
              <button className="subtle" onClick={() => file.current?.click()}>
                <ImagePlus size={15} />
                {recipe.referenceImage
                  ? "Replace reference"
                  : "Add a reference"}
                <span>optional</span>
              </button>
              <span className="counter">{recipe.prompt.length}/2000</span>
              <input
                ref={file}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Upload reference image"
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </div>
            {recipe.referenceImage && (
              <div className="reference">
                <img src={recipe.referenceImage} alt="Your reference" />
                <span>
                  Reference saved with recipe · not used by mock render
                </span>
                <button
                  aria-label="Remove reference"
                  onClick={() => change("referenceImage", undefined)}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="divider" />
            <div className="section-top">
              <h2>
                <SlidersHorizontal size={15} /> The details
              </h2>
            </div>
            <div className="settings">
              <label>
                Model
                <select
                  value={recipe.modelId}
                  onChange={(e) => change("modelId", e.target.value)}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.rate} cr/s
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Duration
                <select
                  value={recipe.durationSec}
                  onChange={(e) => change("durationSec", +e.target.value)}
                >
                  {[4, 6, 8].map((v) => (
                    <option key={v} value={v}>
                      {v} seconds
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Aspect ratio
                <select
                  value={recipe.aspect}
                  onChange={(e) => change("aspect", e.target.value)}
                >
                  {["16:9", "9:16", "1:1"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Resolution
                <select
                  value={recipe.resolution}
                  onChange={(e) => change("resolution", e.target.value)}
                >
                  <option>720p</option>
                  <option>1080p</option>
                </select>
              </label>
            </div>
            <div className="generate-row">
              <div className="generate-context">
                <span className="small-muted">
                  {parent
                    ? "REMIXING A PREVIOUS TAKE"
                    : "NO SURPRISES. JUST POSSIBILITIES."}
                </span>
                <small>
                  {recipe.resolution === "1080p"
                    ? "2× resolution rate"
                    : "1× resolution rate"}{" "}
                  · Reserved while pending; charged on completion; released on failure or cancel
                </small>
              </div>
              <button
                className="primary"
                onClick={() => generate()}
                aria-describedby={cost > remaining ? "cost-breakdown credit-reason" : "cost-breakdown"}
                disabled={!ready || !recipe.prompt.trim() || cost > remaining}
              >
                {!ready ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                Generate <span>{cost} credits</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
            <p className="cost-breakdown" id="cost-breakdown">
              {models.find((model) => model.id === recipe.modelId)?.rate} cr/s × {recipe.durationSec} s × {recipe.resolution === "1080p" ? "2×" : "1×"} = {cost} credits
            </p>
            <div className="credit-tools">
              {cost > remaining && (
                <p className="error" id="credit-reason" role="status">
                  Not enough credits: you have {remaining}, this needs {cost}.
                </p>
              )}
              <button className="subtle" disabled={!ready} onClick={resetDemoCredits}>Reset demo credits</button>
            </div>
          </div>
          <aside className="camera-panel">
            <div className="section-top">
              <h2>
                <Camera size={16} /> Set the motion
              </h2>
              <span className="muted">10 presets</span>
            </div>
            <p className="small-muted">
              A different move. A different feeling.
            </p>
            <div className="preset-grid">
              {presets.map((p, i) => (
                <button
                  key={p.id}
                  className={
                    "preset " + (recipe.cameraPresetId === p.id ? "chosen" : "")
                  }
                  onClick={() => change("cameraPresetId", p.id)}
                  aria-pressed={recipe.cameraPresetId === p.id}
                  title={p.description}
                >
                  <span className={"preset-art motion-" + p.id}>
                    <Motion
                      recipe={motionSamples[p.id]}
                      thumbnail
                      still={p.id === "static"}
                    />
                    <b>
                      {["↗", "↙", "⟳", "←", "→", "↑", "≈", "·", "↟", "↔"][i]}
                    </b>
                    {recipe.cameraPresetId === p.id && (
                      <span className="selected-check">
                        <Check size={10} />
                      </span>
                    )}
                  </span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <div className="camera-caption">
              <span className="accent-dot" />
              {presets.find((p) => p.id === recipe.cameraPresetId)?.description}
            </div>
          </aside>
        </section>
        <div className="honesty">
          <span>
            <span className="accent-dot" />A playground, with the lights on.
          </span>
          <p>
            All clips are procedural <strong>Mock renders</strong>. No paid
            APIs. No hidden charges.
          </p>
        </div>
        <section id="library" className="library">
          <div className="library-heading">
            <div>
              <span className="eyebrow">THE CUTTING ROOM</span>
              <h2>
                Your takes<span>{jobs.length.toString().padStart(2, "0")}</span>
              </h2>
            </div>
            <button
              className="outline"
              disabled={selected.length !== 2}
              onClick={() => {
                setCompare(true);
                setClock(0);
              }}
            >
              <Layers2 size={15} />
              Compare {selected.length > 0 && `(${selected.length}/2)`}
            </button>
          </div>
          <div className="library-tools">
            <div className="tabs" role="group" aria-label="Filter takes">
              {[
                ["all", "All takes"],
                ["keepers", "Keepers"],
                ["active", "In progress"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  {label}
                  {id === "active" && active.length > 0 && (
                    <span>{active.length}</span>
                  )}
                </button>
              ))}
            </div>
            <span className="small-muted">
              {!ready
                ? "Opening storage…"
                : storageError
                  ? "Session only"
                  : saving
                    ? "Saving…"
                    : "Saved on this device"}{" "}
              · {spent}/{total} credits used
            </span>
          </div>
          {storageError && (
            <p className="storage-error" role="alert">
              {storageError}
            </p>
          )}
          {!ready ? (
            <div className="empty">
              <Loader2 className="spin" />
              <h3>Opening your workspace</h3>
              <p>Finding your saved takes…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">
                <Film size={25} />
                <span>+</span>
              </div>
              <h3>
                {tab === "keepers"
                  ? "Good takes deserve a star."
                  : tab === "active"
                    ? "A little breathing room."
                    : "Every great film starts with a first take."}
              </h3>
              <p>
                {tab === "keepers"
                  ? "Mark a finished take as a Keeper to find it here."
                  : tab === "active"
                    ? "Your queue is clear. Your next idea is waiting."
                    : "Describe a scene above. We’ll help you find its rhythm."}
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setTab("all");
                  promptRef.current?.focus();
                  window.scrollTo({
                    top: 0,
                    behavior: matchMedia("(prefers-reduced-motion: reduce)")
                      .matches
                      ? "instant"
                      : "smooth",
                  });
                }}
              >
                Create your {jobs.length ? "next" : "first"} take{" "}
                <ArrowRight size={14} />
              </button>
              <span className="empty-number">01 — ∞</span>
            </div>
          ) : (
            <div className="take-grid">
              {visible.map((j, i) => (
                <article className="take" key={j.id}>
                  <div className="take-preview">
                    {j.status === "done" ? (
                      <>
                        <button
                          className="open-take"
                          aria-label={`Open take ${j.recipe.prompt}`}
                          onClick={() => {
                            setView(j);
                            setClock(0);
                          }}
                        >
                          <Motion recipe={j.recipe} still />
                          <span className="play-circle">
                            <Play size={20} />
                          </span>
                        </button>
                        <button
                          className={
                            "select-take " +
                            (selected.includes(j.id) ? "checked" : "")
                          }
                          aria-label={`Select take ${i + 1} for comparison`}
                          aria-pressed={selected.includes(j.id)}
                          onClick={() => toggle(j.id)}
                        >
                          {selected.includes(j.id) && <Check size={13} />}
                        </button>
                        <span className="mock-badge">Mock render</span>
                        <button
                          className={
                            "keep-button " + (j.isKeeper ? "kept" : "")
                          }
                          aria-label={
                            j.isKeeper ? "Remove Keeper" : "Mark Keeper"
                          }
                          onClick={() => keeper(j)}
                        >
                          <Star
                            size={15}
                            fill={j.isKeeper ? "currentColor" : "none"}
                          />
                        </button>
                      </>
                    ) : (
                      <div className={"job-placeholder " + j.status}>
                        {j.status === "failed" ? (
                          <AlertCircle />
                        ) : j.status === "cancelled" ? (
                          <X />
                        ) : (
                          <Loader2 className="spin" />
                        )}
                        <strong>
                          {j.status === "generating"
                            ? `Finding the frame · ${j.progress}%`
                            : j.status === "queued"
                              ? "In the queue"
                              : j.status === "failed"
                                ? "This take needs another try"
                                : "Take cancelled"}
                        </strong>
                        <p>
                          {j.error ??
                            (j.status === "queued"
                              ? "Getting things ready…"
                              : j.status === "generating"
                                ? "Estimated progress · 8–25 seconds"
                                : "No credits charged.")}
                        </p>
                        {["queued", "generating"].includes(j.status) ? (
                          <>
                            <progress max={100} value={j.progress} />
                            <button
                              className="subtle"
                              onClick={() =>
                                setJobs((old) =>
                                  old.map((x) =>
                                    x.id === j.id ? provider.cancel(x) : x,
                                  ),
                                )
                              }
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="outline"
                            disabled={j.costCredits > remaining}
                            onClick={() => generate(j.recipe, j.id)}
                          >
                            <RotateCcw size={13} />
                            Retry · {j.costCredits} credits
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="take-info">
                    <h3>{j.recipe.prompt}</h3>
                    <p>
                      {models.find((m) => m.id === j.recipe.modelId)?.name}{" "}
                      <span>·</span> {j.recipe.durationSec}s <span>·</span>{" "}
                      {j.recipe.aspect}
                      <span className="take-cost">{j.costCredits} cr</span>
                    </p>
                    <small>
                      {
                        presets.find((p) => p.id === j.recipe.cameraPresetId)
                          ?.name
                      }
                      {j.parentId ? " · Based on an earlier take" : ""}
                      {j.isKeeper ? " · Keeper" : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <footer>
          <span className="brand footer-brand">
            slate<span className="muted">/</span>
            <span className="small-muted">Room for the next idea.</span>
          </span>
          <span className="small-muted">
            Made for making. Not for scrolling.
          </span>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <dialog
        aria-labelledby="result-title"
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const dialog = event.currentTarget;
          const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
            'a[href], button, input, select, textarea, [tabindex]',
          )).filter((element) =>
            element.tabIndex >= 0 && !element.matches(":disabled") &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== "hidden",
          );
          const first = controls[0], last = controls[controls.length - 1];
          const active = document.activeElement;
          if (!first) {
            event.preventDefault();
            dialog.focus();
          } else if (!controls.includes(active as HTMLElement) ||
            (event.shiftKey ? active === first : active === last)) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          setView(null);
          setCompare(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setView(null);
            setCompare(false);
          }
        }}
      >
        <div className="dialog-top">
          <h2 id="result-title">
            {compare ? "Two takes. One feeling." : "The take"}
          </h2>
          <button
            className="icon-button"
            ref={closeResultButton}
            aria-label="Close result"
            disabled={exporting}
            onClick={() => {
              setView(null);
              setCompare(false);
            }}
          >
            <X />
          </button>
        </div>
        {compare ? (
          <>
            <p className="mobile-note">
              Compare works best on a tablet or desktop. Rotate your phone for
              more room.
            </p>
            <div className="compare-grid">
              {jobs
                .filter((j) => selected.includes(j.id))
                .map((j) => (
                  <div key={j.id}>
                    <Motion
                      recipe={j.recipe}
                      clock={clock % (j.recipe.durationSec * 1000)}
                    />
                    <p>{j.recipe.prompt}</p>
                    <small>
                      {
                        presets.find((p) => p.id === j.recipe.cameraPresetId)
                          ?.name
                      }{" "}
                      · Mock render
                    </small>
                    <button
                      className={j.isKeeper ? "primary" : "outline"}
                      onClick={() => keeper(j)}
                    >
                      <Star size={15} />
                      {j.isKeeper ? "Keeper" : "Keep this take"}
                    </button>
                  </div>
                ))}
            </div>
            <div className="playback">
              <button className="outline" onClick={() => setPlaying(!playing)}>
                {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
                {playing ? "Pause" : "Play in sync"}
              </button>
              <button
                className="subtle"
                onClick={() => {
                  setClock(0);
                  setPlaying(false);
                }}
              >
                Restart both
              </button>
            </div>
          </>
        ) : view ? (
          <div className="result-grid">
            <div>
              {view.status === "done" ? (
                <>
              <Motion recipe={view.recipe} clock={clock} />
              <div className="playback">
                <button
                  className="outline"
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
                  {playing ? "Pause" : "Play"}
                </button>
                <span className="muted">
                  {(clock / 1000).toFixed(1)} / {view.recipe.durationSec}s ·
                  Mock render
                </span>
              </div>
                </>
              ) : (
                <div className="empty">
                  <AlertCircle size={28} />
                  <h3>This attempt has no finished clip.</h3>
                  <p>{view.error ?? `This take is ${view.status}.`}</p>
                </div>
              )}
            </div>
            <div className="recipe-panel">
              <span className="eyebrow">THE RECIPE</span>
              <h3>{view.recipe.prompt}</h3>
              <dl>
                <dt>Model</dt>
                <dd>
                  {models.find((m) => m.id === view.recipe.modelId)?.name}
                </dd>
                <dt>Camera</dt>
                <dd>
                  {
                    presets.find((p) => p.id === view.recipe.cameraPresetId)
                      ?.name
                  }
                </dd>
                <dt>Format</dt>
                <dd>
                  {view.recipe.durationSec}s · {view.recipe.aspect} ·{" "}
                  {view.recipe.resolution}
                </dd>
                <dt>Cost</dt>
                <dd>{view.costCredits} credits</dd>
                {view.parentId && (
                  <>
                    <dt>Parent take</dt>
                    <dd>
                      {parentTake ? (
                        <button className="parent-link" disabled={exporting}
                          aria-label={`Open parent take: ${parentTake.recipe.prompt}`}
                          onClick={() => {
                            setView(parentTake);
                            setClock(0);
                            setPlaying(false);
                            closeResultButton.current?.focus();
                          }}>
                          {parentTake.recipe.prompt.trim().slice(0, 80) || "Untitled take"}{parentTake.recipe.prompt.trim().length > 80 ? "…" : ""}
                        </button>
                      ) : <span className="muted">Parent take is no longer available on this device.</span>}
                    </dd>
                  </>
                )}
              </dl>
              <button
                className="primary"
                disabled={exporting}
                onClick={() => remix(view)}
              >
                <RotateCcw size={15} />
                Remix this take
              </button>
              {view.status === "done" && (canRecord ? (
                <button
                  className="outline"
                  disabled={exporting}
                  onClick={() => download(view)}
                >
                  {exporting ? (
                    <Loader2 className="spin" size={15} />
                  ) : (
                    <Download size={15} />
                  )}{" "}
                  {exporting ? "Recording WebM…" : "Download WebM"}
                </button>
              ) : (
                <p className="small-muted">
                  WebM download is unavailable in this browser. Preview and
                  remix still work.
                </p>
              ))}
              {exporting && (
                <p className="small-muted">
                  Keep this tab visible for {view.recipe.durationSec} seconds.
                </p>
              )}
              <p className="small-muted">
                A procedural landscape seeded by your prompt. This is a Mock
                render, not AI-generated footage.
              </p>
            </div>
          </div>
        ) : (
          <div className="empty">
            <Film size={28} />
            <h3>A take is waiting to happen.</h3>
            <p>
              Generate a clip, then open it from Your takes to preview, download
              or remix it.
            </p>
            <button
              className="outline"
              onClick={() => {
                setView(null);
                setCompare(false);
                dialogRef.current?.close();
                promptRef.current?.focus();
              }}
            >
              Back to Create
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
