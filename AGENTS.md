<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Approval and PO business invariants are enforced by database triggers; create drafts through create_approved_po so supplier identity and commercial totals derive only from the recorded manager decision.
- Keep client-safe purchasing validation and printable document serialization in src/lib/purchasing.ts to test monetary and decision rules without server dependencies.
