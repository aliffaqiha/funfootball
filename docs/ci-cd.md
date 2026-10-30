# CI/CD

`.github/workflows/ci-cd.yml` runs lint, TypeScript checks, Prisma client generation, and a production build on pushes and pull requests targeting `main`. It uses a dummy PostgreSQL URL for build-time configuration; the workflow does not connect to or migrate a database.

The same workflow can deploy through the Vercel CLI after CI passes:

- Pushes to `main` deploy to the Vercel production environment.
- Pushes to other branches deploy preview builds.
- Pull requests run CI only. They do not receive Vercel credentials or trigger deployments.

Deployment is disabled until you configure it in GitHub repository settings:

1. Create GitHub environments named `production` and `preview`.
2. Add environment secrets named `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to each environment.
3. Restrict each environment to trusted branches; optionally require approval before deployment.
4. Add the repository Actions variable `VERCEL_DEPLOY_ENABLED` with value `true`.

The workflow contains no deployment credentials. Environment-scoped secrets keep Vercel credentials behind GitHub environment rules. Keep database credentials in Vercel environment variables; database migrations are not run automatically by this workflow.
