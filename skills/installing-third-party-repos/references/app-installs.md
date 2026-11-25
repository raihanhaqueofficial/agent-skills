# Installing apps and CLIs from a repo

Recipes for the "this repo is an app, not a skill bundle" case. Every item is the FIX for a failure that
actually blocks the install — apply the check before you need it.

## Pick the channel from the repo's docs, not from habit

Repos usually document several: a packaged install (npm/PyPI/binary), a source build, and Docker. Prefer
the packaged install. Before choosing Docker, check the daemon actually runs:

```bash
docker info >/dev/null 2>&1 && echo daemon-ok || echo no-daemon   # a client alone is not enough
```

No daemon -> fall back to the packaged or source path; do not burn time on compose files.

## C++ / GUI apps — check feasibility before the download

A full source build of a C++ suite (Blender, Godot, ...) takes hours and needs dozens of system dev
packages. Prefer the official binary release (tarball/AppImage/flatpak). Before extracting, check the
target machine can actually run it:

```bash
# Headless container? No display server -> GUI apps cannot render even if all libraries resolve.
echo "$DISPLAY"  # empty means no X11
test -S /run/user/$(id - u)/wayland-0 2>/dev/null && echo wayland-ok || echo no-wayland
```

No display server and no Mesa software renderer -> a GUI binary will fail at GLX init, not startup.
Report this plainly rather than hunting every missing `.so`.

For a headless CLI-only use (batch render, Python `bpy` module), still check the binary's dynamic
resolver first:

```bash
ldd <path-to-binary> | grep "not found"   # 3-5 missing libs is local-extraction territory; 20+ is "install a desktop environment"
```

A binary with `RUNPATH: $ORIGIN/../lib` that ships its own libraries but omits the SONAME symlinks
(e.g. `libpq.so.5.18` present, `libpq.so.5` missing) fails with "error while loading shared libraries"
even though the file exists. See the "Bundled native libraries" section below.

**Do not leak `LD_LIBRARY_PATH` across extraction commands.** If a previous install fix set
`LD_LIBRARY_PATH` to a payload's private lib directory, `tar`/`xz` may pick up an incompatible
copy of `liblzma.so.5` and die. Run extraction with `LD_LIBRARY_PATH` unset, or scope the variable
to the single command that needs it.

## npm-packaged CLI

```bash
npm prefix -g                      # if this is root-owned, a global install cannot work
mkdir -p $HOME/tools/<name>
npm install --prefix $HOME/tools/<name> --no-audit --no-fund <pkg>@<version>
ln -sf $HOME/tools/<name>/node_modules/.bin/<bin> $HOME/.local/bin/<bin>
```

**Blocked install scripts.** This npm refuses dependency install/postinstall scripts by default and only
warns — you get a CLI that starts and then fails at runtime. The warning names the packages:

```bash
cd $HOME/tools/<name>
npm install-scripts approve <pkg> [<pkg> ...]
npm rebuild          # a plain re-install says "up to date" and does NOT re-run them
```

Verify the native artifacts exist afterwards (e.g. a `prebuilds/linux-x64/*.node` for a pty/FFI package).

**Let a managed installer own its own shim** when the tool provides one (e.g. `paperclipai install`
writes its own shim plus a versioned payload store). Do not replace that shim with a wrapper script — it
breaks the tool's own update/rollback/uninstall.

## Python app with a pinned interpreter

The repo may pin an interpreter this host does not have (`.python-version`, `requires-python`). Do not
force the host's newest Python onto pinned, wheel-sensitive dependencies. Use `uv`, which fetches its own
CPython without root:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh        # lands in ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
cd <repo> && uv python install 3.11 && uv sync --no-dev
```

`uv sync` honours the repo's `uv.lock` (reproducible) and `--no-dev` skips the test/lint group. Check
`[tool.uv] override-dependencies` in `pyproject.toml` for pins the repo has already reconciled.

Then create the config the app expects (often an auto-copied `config.example.toml` -> `config.toml`) and
fix anything that binds to all interfaces before first start.

## Bundled native libraries fail to load (`error while loading shared libraries`)

A payload can ship its shared objects as versioned files only (`libpq.so.5.18`, `libicuuc.so.60.2`) with
the SONAME symlinks (`libpq.so.5`) missing. The loader matches the NEEDED string against a FILE NAME and
does not scan for matching SONAMEs, so it reports the library missing even though it is right there — and
an init script that shells out to such a binary dies with exit code 127.

Diagnose and fix:

```bash
readelf -d <binary> | grep -E 'NEEDED|RUNPATH'    # a $ORIGIN/../lib RUNPATH means the libs ship alongside
for f in <libdir>/lib*.so.*; do
  s=$(readelf -d "$f" | sed -n 's/.*SONAME.*\[\(.*\)\]/\1/p')
  [ -n "$s" ] && [ "$(basename "$f")" != "$s" ] && ln -sf "$(basename "$f")" "<libdir>/$s"
done
```

This lives inside the installed payload, so re-run it after every version change and note it in
`INSTALL-NOTES.md`. Do not conclude the platform needs a system package: a bundled copy is usually the
point of the payload.

## Server hygiene before first start

- Loopback-bind: change a shipped `0.0.0.0` / `listen_host` to `127.0.0.1`, or pass the CLI's host flag.
- Repeat any auth-disabled or trusted-network warning the app logs.
- Start long-running servers as tracked background processes, not with `nohup`/`&` wrappers, and use the
  persistence flag if it should outlive the session.
- If the app needs a background service manager (systemd user unit) and the container has none, say so:
  the user starts it manually after a restart.
- Note the data directory the app chose (often `~/.<app>` or an XDG path) so backups and later updates are
  obvious.
- **Verify every surface the app exposes.** Many apps ship both an API and a WebUI on different ports
  (e.g. FastAPI on 8080, Streamlit on 8501). Start each one and `curl` it independently. Do not report
  "the UI works" from a log line — require HTTP 200 and the expected title/version in the response.
