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
    AUTH0_SECRET          = var.auth0_secret
    AUTH0_BASE_URL        = var.auth0_base_url
    AUTH0_ISSUER_BASE_URL = var.auth0_issuer_base_url
    AUTH0_CLIENT_ID       = var.auth0_client_id
    AUTH0_CLIENT_SECRET   = var.auth0_client_secret
    DATABASE_URL          = var.database_url
    RESEND_API_KEY        = var.resend_api_key
    GOOGLE_CLIENT_ID      = var.google_client_id
    GOOGLE_CLIENT_SECRET  = var.google_client_secret
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
