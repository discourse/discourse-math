require 'rails_helper'

describe PrettyText do

  context 'markdown it' do
    before do
      SiteSetting.discourse_math_enabled = true
    end

    it 'can handle inline math' do
      cooked = PrettyText.cook('I like $\{a,b\}\$<a>$ etc')
      html = '<p>I like <span class="math">\{a,b\}\$&lt;a&gt;</span> etc</p>'
      expect(cooked).to eq(html)
    end

    it 'can correctly ignore bad blocks' do
      cooked = PrettyText.cook <<~MD
        $$a
        a
        $$"
      MD

      html = <<~HTML
        <p>$$a<br>
        a<br>
        $$"</p>
      HTML

      expect(cooked).to eq(html.strip)
    end

    it 'can handle inline edge cases' do
      expect(PrettyText.cook ",$+500\\$").not_to include('math')
      expect(PrettyText.cook "$+500$").to include('math')
      expect(PrettyText.cook ",$+500$,").to include('math')
      expect(PrettyText.cook "200$ + 500$").not_to include('math')
      expect(PrettyText.cook ",$+500$x").not_to include('math')
      expect(PrettyText.cook "y$+500$").not_to include('math')
      expect(PrettyText.cook "($ +500 $)").to include('math')
    end

    it 'can handle inline math' do
      cooked = PrettyText.cook <<~MD
        I like
        $$
        \{a,b\}\$<a>
        $$
        etc
      MD

      html = <<~HTML
        <p>I like</p>
        <div class="math">
        {a,b}$&lt;a&gt;
        </div>
        <p>etc</p>
      HTML

      expect(cooked).to eq(html.strip)
    end
  end
end
