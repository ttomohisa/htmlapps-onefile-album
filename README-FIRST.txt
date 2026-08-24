Single HTML App Template
========================

1. Read README.ja.md.
2. Rewrite APP_SPEC.md for the new application.
3. Update app.config.json.
4. Inspect components/ and reuse generic UI snippets where they fit: Undo toast for reversible actions, confirmation dialog for irreversible/high-risk actions, compact popover menus, preset/custom numeric settings, async source guards, and the mobile bottom bar when persistent smartphone navigation/actions help.
5. Give the repository to the coding LLM and tell it to read AGENTS.md first.
6. If the app exports files, make the output filename user-editable before export.
7. Run build-standalone.bat on Windows.
8. Review dist\build-size-report.json, then open dist\index.html and dist\index.self-extract.html directly and test both with the network disabled.

Do not edit either generated HTML in dist\ manually.
