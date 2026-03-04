terraform {
  required_version = ">= 1.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }

  # Uncomment to store state remotely in Terraform Cloud (recommended):
  # cloud {
  #   organization = "your-org"
  #   workspaces {
  #     name = "scheduling-app"
  #   }
  # }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

resource "vercel_project" "app" {
  name      = var.project_name
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = var.github_repo
  }
}

locals {
  env_vars = {
    APP_BASE_URL         = var.app_base_url
    AUTH0_CLIENT_ID      = var.auth0_client_id
    AUTH0_CLIENT_SECRET  = var.auth0_client_secret
    AUTH0_DOMAIN         = var.auth0_domain
    AUTH0_SECRET         = var.auth0_secret
    DATABASE_URL         = var.database_url
    GOOGLE_CLIENT_ID     = var.google_client_id
    GOOGLE_CLIENT_SECRET = var.google_client_secret
    RESEND_API_KEY       = var.resend_api_key
  }
}

resource "vercel_project_environment_variable" "vars" {
  for_each = local.env_vars

  project_id = vercel_project.app.id
  key        = each.key
  value      = each.value
  target     = ["production", "preview"]
  sensitive  = true
}

resource "vercel_project_domain" "custom" {
  project_id = vercel_project.app.id
  domain     = "schedule.scadu.to"
}
