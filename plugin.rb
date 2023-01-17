# frozen_string_literal: true

# name: discourse-math
# about: Official mathjax plugin for Discourse
# version: 0.9
# authors: Sam Saffron (sam)
# url: https://github.com/discourse/discourse-math
# transpile_js: true

register_asset "stylesheets/common/discourse-math.scss"
register_asset "stylesheets/ext/discourse-chat.scss"

enabled_site_setting :discourse_math_enabled

after_initialize do
  chat&.enable_markdown_feature("discourse-math") if respond_to?(:chat) && SiteSetting.chat_enabled
end
