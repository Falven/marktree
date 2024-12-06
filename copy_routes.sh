#!/bin/zsh

# Check if the target directory is provided as an argument
if [ -z "$1" ]; then
  echo "Usage: $0 <target_directory>"
  exit 1
fi

# Define the target directory from the first argument
TARGET_DIR=$1

# Create a tree of the directory structure
tree_output=$(tree $TARGET_DIR)

# Initialize a variable to hold the contents
all_contents="\`\`\`sh\n$tree_output\n\`\`\`\n\n"

# Iterate through every file in the directory
for file in $(find $TARGET_DIR -type f); do
  # Append the file path to the contents
  all_contents+="\n$file\n"
  # Append the file contents wrapped in ts markdown block
  all_contents+="\`\`\`ts\n$(cat $file)\n\`\`\`\n"
done

# Copy everything to the clipboard
echo -e "$all_contents" | pbcopy

echo "Directory structure and file contents have been copied to the clipboard."
