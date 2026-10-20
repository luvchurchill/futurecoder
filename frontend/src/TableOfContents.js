import React from 'react';
import "./css/toc.scss"
import chapters from "./chapters.json"
import {bookState, isPageUnlocked, sequentialCourse} from "./book/store";
import terms from "./terms.json"

export const TableOfContents = () => {
  const current = bookState.user.pageSlug;
  return (
    <div className="backend bg-dark toc">
      <div className="toc-header">
        <div className="container">
          <h1>futurecoder</h1>
          {sequentialCourse
            ? <p>Complete each lesson to unlock the next. You can return to completed lessons at any time. Progress is saved automatically on this computer.</p>
            : <div dangerouslySetInnerHTML={{__html: terms.toc_instructions}}/>}
        </div>
      </div>

      <div className="container toc-container">
        <div className="row">
          <div className="col-md-9" role="main">
            <div className="toc-section">
              <h1 id="toc-toc">
                {terms.table_of_contents}
              </h1>
              <ol className="toc-ol">
                {chapters.map(chapter =>
                  <li>
                    <h2>{chapter.title}</h2>
                    <ol>
                      {chapter.pages.map(page => {
                        const isCurrent = page.slug === current;
                        const locked = !isPageUnlocked(page.slug);
                        const PageLink = locked ? "span" : "a";
                          return <li>
                            <PageLink href={locked ? undefined : "#" + page.slug}
                               aria-disabled={locked || undefined}
                               title={locked ? "Complete the previous lessons first" : undefined}
                               style={isCurrent ? {
                                 border: '2px solid white',
                                 fontWeight: 'bold',
                                 padding: '5px',
                                 lineHeight: 2
                               } : {}}
                              // May have HTML generated from markdown
                               dangerouslySetInnerHTML={{__html: page.title}}/>
                            {locked && " 🔒"}
                            {isCurrent && ` ${terms.current_page}`}
                          </li>;
                        }
                      )}
                    </ol>
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
