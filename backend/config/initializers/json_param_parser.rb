# config/initializers/json_param_parser.rb
ActionDispatch::Request.parameter_parsers = ActionDispatch::Request.parameter_parsers.merge(
  Mime[:json].symbol => ->(*args) {
    raw_post = args.first
    data = JSON.parse(raw_post)
    data.is_a?(Hash) ? data : { _json: data }
  }
)