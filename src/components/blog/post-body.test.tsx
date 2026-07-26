import { render, screen } from '@testing-library/react';

import { PostBody } from '@/components/blog/post-body';
import { makePost } from '@/test/make-post';

describe('PostBody', () => {
  it('renders paragraph text from a serialized lexical body', () => {
    render(<PostBody body={makePost().body} />);
    expect(screen.getByText('body text')).toBeInTheDocument();
  });
});
