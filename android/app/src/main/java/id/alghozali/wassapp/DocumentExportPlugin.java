package id.alghozali.wassapp;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/** Shares a generated document via Android's chooser without storage permission. */
@CapacitorPlugin(name = "DocumentExport")
public class DocumentExportPlugin extends Plugin {
    @PluginMethod
    public void share(PluginCall call) {
        String html = call.getString("html");
        if (html == null || html.isEmpty() || html.length() > 2_000_000) {
            call.reject("Dokumen kosong atau terlalu besar.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                File directory = new File(getContext().getCacheDir(), "documents");
                if (!directory.isDirectory() && !directory.mkdirs()) {
                    throw new java.io.IOException("Tidak dapat membuat dokumen.");
                }
                File[] oldFiles = directory.listFiles();
                if (oldFiles != null) {
                    long cutoff = System.currentTimeMillis() - 86_400_000L;
                    for (File old : oldFiles) {
                        if (old.isFile() && old.lastModified() < cutoff && !old.delete()) {
                            // Cache cleanup is best effort; sharing the new file may continue.
                        }
                    }
                }
                File file = File.createTempFile("Dokumen_AI_", ".doc", directory);
                try (FileOutputStream output = new FileOutputStream(file)) {
                    output.write(("\uFEFF" + html).getBytes(StandardCharsets.UTF_8));
                }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("application/msword");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.setClipData(ClipData.newRawUri("Dokumen AI", uri));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(Intent.createChooser(send, "Simpan atau bagikan dokumen"));
                call.resolve(new JSObject());
            } catch (Exception error) {
                call.reject("Tidak dapat membuka panel berbagi dokumen.", error);
            }
        });
    }
}
