{
  'use strict';

  console.log('init…');

  const PER_PAGE = 100;
  let startPage = 1;

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    backupRepo(e.target);
  });

  let allIssues = [];
  let fetchIssues = (opt) => {
    let issueUrl = `https://api.github.com/repos/${opt.user}/${opt.repo}/issues?per_page=${PER_PAGE}&page=${startPage}&state=all&access_token=${window.ACCESS_TOKEN}`;

    window.fetch(issueUrl)
    .then((response) => {
      if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' + response.status);
        return;
      }
      return response.json();
    })
    .then((issues) => {
      // console.log('issues.length', issues.length, issues);
      allIssues = allIssues.concat(issues);

      if (issues.length === PER_PAGE) {
        startPage += 1;
        console.log('+startPage', startPage, allIssues.length);
        fetchIssues(issueUrl);
        return false;
      } else {
        startPage = 1;
        return allIssues;
      }
      console.log(allIssues.length);
    })
    .then((issues) => {
      if (!issues) { return; }

      // re-sort from last
      let sortFn = (a, b) => b.number - a.number;
      issues = issues.sort(sortFn);

      window.githubIssues = issues;
      // console.log('Backup issues success!', issues);
      console.log('Successfully backup issues!');
      console.log('all issues:', issues.length);

      Promise.all(issues.map((issue, index) => {
        if (!issue.comments) { return; }
        return window.fetch(issue.comments_url + `?access_token=${ACCESS_TOKEN}&per_page=${PER_PAGE}`)
          .then((resp) => resp.text());
      }))
      .then((comments) => {
        issues.forEach((issue, index) => {
          if (comments[index]) {
            issue.comments_content = comments[index];
          }
        });
        return issues;
      })
      .then((issues) => {
        console.log('final issues', issues);

        let date = new Date().toISOString().split(/T/)[0];
        let downloadLink;

        if (opt.form.getElementsByTagName('a').length) {
          downloadLink = opt.form.getElementsByTagName('a')[0];
        } else {
          downloadLink = document.createElement('a');
          opt.form.appendChild(downloadLink);
        }

        downloadLink.innerHTML = `Download ${opt.repo}-latest.json`;
        let file = new window.Blob([JSON.stringify(issues, null, 2)], {type: 'application/json'});
        downloadLink.href = window.URL.createObjectURL(file);
        downloadLink.onclick = () => {
          downloadLink.download = `${opt.repo}-latest.json`;
        };
      });
    })
    .catch((err) => {
      console.log('Fetch Error :-S', err);
    });
  };

  let backupRepo = ($form) => {
    targetForm = $form;
    let $input = $form.getElementsByTagName('input')[0];
    let inputValue = $input.value.trim();
    allIssues = []; // reset

    if (!inputValue.match(/[^/]+?\/[^/]+?/)) { return; }

    fetchIssues({
      user: inputValue.split('/')[0],
      repo: inputValue.split('/')[1],
      form: $form
    });
  };
}
