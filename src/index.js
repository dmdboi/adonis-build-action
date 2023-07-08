const core = require("@actions/core");
const github = require("@actions/github");
const io = require("@actions/io");
const { exec } = require("@actions/exec");
const { join } = require("path");

// Inputs
const pushToBranch = core.getInput("pushToBranch");
const branchName = core.getInput("branch");
const githubToken = core.getInput("githubToken");
const directory = process.env.GITHUB_WORKSPACE;

/** Fail if there's no Github Token and pushToBranch === true */
if (pushToBranch == true && !githubToken)
  return exit("A GitHub secret token is a required input for pushing code (hint: use ${{ secrets.GITHUB_TOKEN }} )");

(async () => {
  const tsconfigPath = join(directory, "../tsconfig.json");

  try {
    /** Install Dependencies */
    core.info("Installing dependencies");
    await exec(`npm i`, [], { cwd: directory }).catch((_err) => {});

    /** Build Project */
    console.info("Building project");
    const build = await exec(`npm run build`, [], { cwd: directory });
    if (build !== 0) return exit("Something went wrong while building.");
    if (pushToBranch == "false") return process.exit(0);

    /** Push to Branch Code */
    const octokit = github.getOctokit(githubToken);

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    const branches = await octokit.rest.repos.listBranches({
      owner,
      repo,
    });

    const branchExists = branches.data.some((branch) => branch.name.toLowerCase() === branchName);
    // Set up Git user
    core.info("Configuring Git user");
    await exec(`git config --global user.name actions-user`);
    await exec(`git config --global user.email action@github.com`);

    core.info("Cloning branch");
    const clone = await exec(
      `git clone https://${github.context.actor}:${githubToken}@github.com/${owner}/${repo}.git branch-${branchName}`
    );
    if (clone !== 0) return exit("Something went wrong while cloning the repository.");
    // Check out to branch
    await exec(`${branchExists ? `git checkout ${branchName}` : `git checkout --orphan ${branchName}`}`, [], {
      cwd: `branch-${branchName}`,
    });

    // Copy compiled files and package* files
    core.info("Copying compiled files and package* files");

    core.info(join(directory, outDir));

    await io.cp(join(directory, outDir), `branch-${branchName}`, {
      recursive: true,
    });

    await io.cp(join(directory, "package.json"), `branch-${branchName}`);
    await io.cp(join(directory, "package-lock.json"), `branch-${branchName}`);

    // Commit files
    core.info("Adding and commiting files");
    await exec(`git add build/*"`, [], { cwd: `branch-${branchName}` });
    // We use the catch here because sometimes the code itself may not have changed
    await exec(`git commit -m "build: ${github.context.sha}"`, [], {
      cwd: `branch-${branchName}`,
    }).catch((_err) => core.warning("Couldn't commit new changes because there aren't any"));

    // Push files
    core.info("Pushing new changes");
    if (branchExists) {
      await exec(`git push origin :${branchName}`, [], {
        cwd: `branch-${branchName}`,
      });
    }

    await exec(`git subtree push --prefix ${outDir} origin ${branchName}`, [], {
      cwd: `branch-${branchName}`,
    });

    process.exit(0);
  } catch (error) {
    exit(`Something went wrong: ${error}`);
  }
})();

function exit(error) {
  core.setFailed(error);
  process.exit();
}
