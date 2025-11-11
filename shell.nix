{ pkgs ? import <nixpkgs> {} }: 
  pkgs.mkShell {
    nativeBuildInputs = with pkgs; [
      nodejs
      yarn
      twitch-cli
      typescript
    ];

    shellHook = ''
      echo "Shell ready.";
      exec nvim .;
    '';
}
