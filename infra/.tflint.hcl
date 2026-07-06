# Shared tflint config for all infra/ OpenTofu roots. The bundled "terraform"
# ruleset needs no plugin download, so CI stays hermetic. Run via:
#   TFLINT_CONFIG_FILE=infra/.tflint.hcl tflint --chdir=<dir>
config {
  call_module_type = "local" # lint the local api-env module through each env
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}
