using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("The Howling Whispers")]
[assembly: AssemblyDescription("Windows launcher for The Howling Whispers")]
[assembly: AssemblyCompany("Patina Works")]
[assembly: AssemblyProduct("The Howling Whispers")]
[assembly: AssemblyVersion("0.4.5.0")]
[assembly: AssemblyFileVersion("0.4.5.0")]

internal static class HowlingWhispersLauncher
{
    [STAThread]
    private static void Main()
    {
        string applicationDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string launcher = Path.Combine(
            applicationDirectory,
            "System",
            "START THE HOWLING WHISPERS.bat"
        );
        if (!File.Exists(launcher))
        {
            launcher = Path.Combine(applicationDirectory, "START THE HOWLING WHISPERS.bat");
        }

        if (!File.Exists(launcher))
        {
            MessageBox.Show(
                "START THE HOWLING WHISPERS.bat was not found beside this executable.\n\n" +
                "Extract the complete application folder before launching.",
                "The Howling Whispers",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return;
        }

        try
        {
            ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.FileName = launcher;
            startInfo.WorkingDirectory = Path.GetDirectoryName(launcher);
            startInfo.UseShellExecute = true;
            Process.Start(startInfo);
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "The Windows launcher could not be started.\n\n" + error.Message,
                "The Howling Whispers",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }
}
