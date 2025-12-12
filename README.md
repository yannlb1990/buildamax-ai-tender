# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fd8a67ed-42fe-497d-b32f-46823fda191f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fd8a67ed-42fe-497d-b32f-46823fda191f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Duplicating the App

If you want to stand up another instance of this PDF takeoff tool (for example, to test isolated feature work or hand off a copy to a teammate), follow these steps:

1. Clone the repository to your target location. If you need a clean copy without any local changes, remove existing remotes or use a fresh directory:
   ```bash
   git clone <repo-url> buildamax-takeoff-clone
   cd buildamax-takeoff-clone
   ```
2. Install dependencies. Use the same package manager across environments (this project currently tracks lockfiles for npm and Bun):
   ```bash
   npm install
   ```
3. Build or start the development server:
   ```bash
   npm run build   # production build
   npm run dev     # local development
   ```
4. Ensure environment variables are mirrored if your deployment uses Supabase or other services (see the `supabase/` directory for the existing configuration). Copy any required `.env` files or secrets into the duplicated project.
5. For a fully isolated duplicate, create a new Git remote to push changes without affecting the original:
   ```bash
   git remote remove origin
   git remote add origin <new-repo-url>
   git push -u origin work
   ```

These steps produce an identical working copy of the application, ready for customization or deployment.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fd8a67ed-42fe-497d-b32f-46823fda191f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
