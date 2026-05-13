require "database_cleaner/active_record"

# Shared context for tests that need fixtures visible across multiple threads
# (e.g. concurrency tests). Uses DatabaseCleaner :deletion strategy so rows
# committed by threads outside the test transaction are actually visible and
# cleaned up between examples.
#
# Usage: include_context "non_transactional" — or metadata :non_transactional
RSpec.shared_context "non_transactional" do
  around do |example|
    DatabaseCleaner.strategy = :deletion
    DatabaseCleaner.cleaning { example.run }
  end
end

RSpec.configure do |config|
  config.include_context "non_transactional", :non_transactional
end
