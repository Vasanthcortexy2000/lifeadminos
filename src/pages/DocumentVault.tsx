import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  FileText, Download, Trash2, Upload, Loader2, 
  Search, FolderOpen, ExternalLink, ArrowLeft
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  type: string;
  file_url: string | null;
  source_type: string | null;
  uploaded_at: string;
  processed: boolean;
  obligation_count?: number;
}

export default function DocumentVault() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch documents with obligation count
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Get obligation counts per document
      const { data: obligations } = await supabase
        .from('obligations')
        .select('document_id')
        .eq('user_id', user.id)
        .not('document_id', 'is', null);

      const countMap = new Map<string, number>();
      obligations?.forEach((ob) => {
        if (ob.document_id) {
          countMap.set(ob.document_id, (countMap.get(ob.document_id) || 0) + 1);
        }
      });

      const docsWithCounts = (docs || []).map((doc) => ({
        ...doc,
        obligation_count: countMap.get(doc.id) || 0,
      }));

      setDocuments(docsWithCounts);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string, fileUrl: string | null) => {
    setDeletingId(id);
    try {
      // Delete from storage if there's a file
      if (fileUrl) {
        const path = fileUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('documents').remove([path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      toast({
        title: 'Document deleted',
        description: 'The document has been removed.',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('text')) return '📝';
    return '📎';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back button and title */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Document Vault</h1>
            <p className="text-sm text-muted-foreground">
              All your uploaded documents in one place
            </p>
          </div>
        </div>

        {/* Search and upload */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => navigate('/#add-documents')} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload New
          </Button>
        </div>

        {/* Documents grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Upload a document to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/#add-documents')}>
                  Upload Document
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl" role="img" aria-label={doc.type}>
                        {getFileIcon(doc.type)}
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-medium truncate">
                          {doc.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={doc.processed ? 'default' : 'secondary'}>
                      {doc.processed ? 'Processed' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {doc.obligation_count} obligation{doc.obligation_count !== 1 ? 's' : ''}
                      </span>
                      {doc.source_type && (
                        <Badge variant="outline" className="text-xs">
                          {doc.source_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8"
                        >
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open document"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={deletingId === doc.id}
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove "{doc.name}" from your vault. Any obligations
                              extracted from this document will remain.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(doc.id, doc.file_url)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats summary */}
        {documents.length > 0 && (
          <div className="mt-8 p-4 bg-secondary/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''} •{' '}
              {documents.reduce((sum, d) => sum + (d.obligation_count || 0), 0)} obligations extracted
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
