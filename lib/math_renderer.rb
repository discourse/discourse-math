# the idea here is to support server rendering
# there is a node example and we could inject this in a post processing job

require 'json'

class MathRenderer
  def initialize
    @stdin, @stdout, @waiter = Open3.popen2('node render.js', :chdir => File.dirname(__FILE__))
  end

  def close
    @stdin.close
    return @waiter.status
  end

  def render(mathjax, format, options = {})
    @stdin.puts JSON.generate({:format => format, :math => mathjax})
    return JSON.parse(@stdout.gets)["html"]
  end
end
