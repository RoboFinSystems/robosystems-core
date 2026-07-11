// Mock for react-markdown
const React = require('react')
const PropTypes = require('prop-types')

const ReactMarkdown = ({ children, ...props }) => {
  return React.createElement(
    'div',
    { 'data-testid': 'react-markdown', ...props },
    children
  )
}

ReactMarkdown.propTypes = {
  children: PropTypes.node,
}

module.exports = ReactMarkdown
module.exports.default = ReactMarkdown
