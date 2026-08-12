import subprocess

import requests


def run_shell(command: str) -> str:
    return subprocess.run(command, shell=True, capture_output=True, text=True).stdout


TOOLS = {"run_shell": run_shell}


def summarize_page(agent, url: str) -> str:
    page = requests.get(url, timeout=10).text
    # Fetched content is untrusted, but goes into the prompt with a shell
    # tool bound and every tool call auto-executed.
    return agent.run(
        prompt=f"Summarize this page:\n\n{page}",
        tools=TOOLS,
        auto_execute=True,
    )
