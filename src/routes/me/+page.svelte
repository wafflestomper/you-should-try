<script>
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>
<svelte:head><title>Your profile · You Should Try</title></svelte:head>

<h1>Your profile</h1>
<form method="POST" action="?/save" use:enhance={() => async ({ update }) => update({ reset: false })} class="pf">
  <label for="name">Your name on the board</label>
  <input id="name" name="name" value={data.me.name} maxlength="40" required autocomplete="nickname" />
  <p class="hint">This is what everyone sees on your recommendations. A nickname is fine. If someone else has the same first name, the board adds a last initial so you can tell each other apart, so include your last name if you want that to work.</p>

  <label for="how">How people know you <span class="opt">(optional)</span></label>
  <input id="how" name="how_known" value={data.me.how_known} maxlength="40" placeholder="St. Chris, tennis, church…" />

  {#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}
  {#if form?.saved}<p class="ok" role="status">Saved.</p>{/if}
  <button class="btn dark">Save</button>
</form>
{#if data.me.email}<p class="hint">Signed in as {data.me.email}</p>{/if}

<style>
  h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 14px 0 12px; }
  .pf { display: grid; gap: 6px; max-width: 520px; }
  label { font-weight: 800; font-size: 15px; margin-top: 10px; }
  input { min-height: 48px; border-radius: 12px; border: 1px solid var(--line); padding: 0 12px; font: 17px Manrope, sans-serif; }
  .hint { color: var(--ink-2); font-size: 13.5px; margin: 2px 0 0; max-width: 60ch; }
  .opt { font-weight: 600; color: var(--ink-3); }
  .btn { min-height: 48px; margin-top: 14px; justify-self: start; padding: 0 28px; }
  .err { color: #B42318; font-weight: 700; }
  .ok { color: #1F7A4A; font-weight: 700; }
</style>
