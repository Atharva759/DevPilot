# Secrets and environment setup

Never put API keys, OAuth client secrets, database passwords, encryption
passwords, or salts in source files or commit them to Git.

## Local setup

1. Copy the root `.env.example` to `.env` and replace its example values with
   local values. Docker Compose reads this file automatically.
2. Copy `client/.env.example` to `client/.env.local` if you need to change the
   frontend API URL.
3. Configure the backend environment variables from `.env.example` in your
   IDE's run configuration or in the shell that starts Maven. Spring Boot
   reads process environment variables; it does not automatically load `.env`.
4. Start the database with `docker compose up -d postgres`, then start the
   backend and frontend using the project's normal development commands.

The backend requires `DB_PASSWORD`, `NVIDIA_API_KEY`, `GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET`, `TOKEN_ENCRYPTOR_PASSWORD`, and
`TOKEN_ENCRYPTOR_SALT`. Use a unique, high-entropy encryption password and
salt; changing either later can make previously encrypted tokens unreadable.
Do not use the example values outside local setup.

## Before publishing the source

- Check `git status` and `git diff` to ensure no credentials are staged or
  included in the proposed commit.
- `.gitignore` prevents new untracked secret files from being added, but it
  does not remove a file that Git already tracks or erase repository history.
- If any credential was committed or pushed, revoke/rotate it with its
  provider. This includes API keys, OAuth secrets, database passwords, and
  encryption credentials. Removing the value from the current file is not
  enough to invalidate an exposed credential.
- Never publish a real `.env`, `.env.local`, private key, or credentials file.
