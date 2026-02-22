# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

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

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

### AI Heart Rate Analysis (Edge Function) on deploy

If the **AI Heart Rate Analysis** shows "Failed to send a request to the Edge Function" on the deployed app:

1. **Set environment variables** in your deployment (e.g. Lovable Project Settings / your host’s env):
   - `VITE_SUPABASE_URL` – your Supabase project URL (e.g. `https://xxxxx.supabase.co`)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` – your project’s anon/public key

2. **Deploy the Edge Function** to the **same** Supabase project:
   ```sh
   supabase functions deploy analyze-heartrate
   ```

3. **Set the function secret** in Supabase (Dashboard → Project Settings → Edge Functions → Secrets, or CLI):
   ```sh
   supabase secrets set LOVABLE_API_KEY=your_lovable_api_key
   ```

The deployed app must use the same Supabase project as where `analyze-heartrate` is deployed; otherwise the request will fail.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
