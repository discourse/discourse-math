# name: discourse-math
# about: Official mathjax plugin for Discourse
# version: 0.9
# authors: Sam Saffron (sam)
# url: https://github.com/discourse/discourse-math

enabled_site_setting :discourse_math_enabled
register_asset 'stylesheets/mathjax.css'

load File.expand_path('../lib/math_renderer.rb', __FILE__)

DiscourseEvent.on(:before_post_process_cooked) do |doc, post|
  begin
    renderer = MathRenderer.new()
    doc.css(".math").each do |elt|
      format = if elt.name == "span" then "inline-TeX" else "TeX" end
      elt.replace(renderer.render(elt.content, format))
    end
    renderer.close
  rescue StandardError => msg
    puts 'ERROR', msg
  end
end
